import logging
import os

import asyncpg
from telegram import (
    BotCommand,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    Update,
)
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ConversationHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN: str = os.environ["TELEGRAM_TOKEN"]
DATABASE_URL: str = os.environ["DATABASE_URL"]

WAITING_LOCATION, WAITING_LABEL = range(2)


# ─── /start ──────────────────────────────────────────────────────────────────

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "👋 <b>Bot de Cortes de Luz</b>\n\n"
        "Te aviso cuando se vaya o llegue la luz cerca de tus ubicaciones guardadas.\n\n"
        "Comandos:\n"
        "  /add_location — Guardar una ubicación\n"
        "  /mis_ubicaciones — Ver tus ubicaciones\n"
        "  /borrar_ubicacion — Eliminar una ubicación\n"
        "  /cancel — Cancelar operación",
        parse_mode="HTML",
    )


# ─── /add_location ────────────────────────────────────────────────────────────

async def add_location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    keyboard = [[KeyboardButton("📍 Usar mi ubicación actual", request_location=True)]]
    await update.message.reply_text(
        "Envíame la ubicación que quieres monitorear.\n"
        "Puedes tocar el botón para usar tu posición actual, "
        "o compartir cualquier punto desde el mapa de Telegram.",
        reply_markup=ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True),
    )
    return WAITING_LOCATION


async def receive_location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    loc = update.message.location
    context.user_data["pending_lon"] = loc.longitude
    context.user_data["pending_lat"] = loc.latitude
    await update.message.reply_text(
        "¿Cómo quieres llamar a esta ubicación? (ej: Casa, Trabajo, Hospital)\n"
        "O envía /skip para guardarla sin nombre.",
        reply_markup=ReplyKeyboardRemove(),
    )
    return WAITING_LABEL


async def receive_label(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    return await _save_location(update, context, update.message.text.strip()[:80])


async def skip_label(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    return await _save_location(update, context, "Mi ubicación")


async def _save_location(
    update: Update, context: ContextTypes.DEFAULT_TYPE, label: str
) -> int:
    lon: float = context.user_data.pop("pending_lon")
    lat: float = context.user_data.pop("pending_lat")
    user = update.effective_user
    chat_id = update.effective_chat.id

    pool: asyncpg.Pool = context.bot_data["db_pool"]
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO user_locations (telegram_user_id, chat_id, first_name, label, geom)
            VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography)
            RETURNING id
            """,
            user.id, chat_id, user.first_name or "Usuario", label, lon, lat,
        )

    await update.message.reply_text(
        f"✅ <b>{label}</b> guardada (#{row['id']}).\n"
        "Te notificaré cuando se vaya o llegue la luz cerca de ahí.",
        parse_mode="HTML",
    )
    return ConversationHandler.END


# ─── /mis_ubicaciones ─────────────────────────────────────────────────────────

async def mis_ubicaciones(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    pool: asyncpg.Pool = context.bot_data["db_pool"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, label,
                   ST_Y(geom::geometry) AS lat,
                   ST_X(geom::geometry) AS lon,
                   created_at
            FROM user_locations
            WHERE telegram_user_id = $1
            ORDER BY created_at DESC
            LIMIT 10
            """,
            update.effective_user.id,
        )

    if not rows:
        await update.message.reply_text(
            "No tienes ubicaciones guardadas.\nUsa /add_location para agregar una."
        )
        return

    lines = [f"📍 <b>Tus ubicaciones ({len(rows)}):</b>\n"]
    for r in rows:
        lines.append(
            f"• <b>{r['label']}</b> — {r['lat']:.5f}, {r['lon']:.5f} <i>(#{r['id']})</i>"
        )
    lines.append("\nUsa /borrar_ubicacion para eliminar alguna.")
    await update.message.reply_text("\n".join(lines), parse_mode="HTML")


# ─── /borrar_ubicacion ────────────────────────────────────────────────────────

async def borrar_ubicacion(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    pool: asyncpg.Pool = context.bot_data["db_pool"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, label, ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lon
            FROM user_locations
            WHERE telegram_user_id = $1
            ORDER BY created_at DESC
            """,
            update.effective_user.id,
        )

    if not rows:
        await update.message.reply_text(
            "No tienes ubicaciones guardadas.\nUsa /add_location para agregar una."
        )
        return

    keyboard = [
        [InlineKeyboardButton(
            f"🗑 {r['label']}  ({r['lat']:.4f}, {r['lon']:.4f})",
            callback_data=f"del:{r['id']}",
        )]
        for r in rows
    ]
    keyboard.append([InlineKeyboardButton("Cancelar", callback_data="del:cancel")])

    await update.message.reply_text(
        "¿Qué ubicación quieres eliminar?",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def handle_delete_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query: CallbackQuery = update.callback_query
    await query.answer()

    if query.data == "del:cancel":
        await query.edit_message_text("Cancelado.")
        return

    location_id = int(query.data.split(":")[1])
    pool: asyncpg.Pool = context.bot_data["db_pool"]

    async with pool.acquire() as conn:
        # La condición telegram_user_id evita que un usuario borre ubicaciones ajenas
        row = await conn.fetchrow(
            "DELETE FROM user_locations WHERE id = $1 AND telegram_user_id = $2 RETURNING label",
            location_id, query.from_user.id,
        )

    if row:
        await query.edit_message_text(
            f"✅ Ubicación <b>{row['label']}</b> eliminada.", parse_mode="HTML"
        )
    else:
        await query.edit_message_text("No se encontró la ubicación.")


# ─── /cancel ──────────────────────────────────────────────────────────────────

async def unknown_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        f"❓ Comando <code>{update.message.text}</code> no reconocido.\n\n"
        "Comandos disponibles:\n"
        "  /start — Bienvenida e instrucciones\n"
        "  /add_location — Guardar una ubicación\n"
        "  /mis_ubicaciones — Ver tus ubicaciones\n"
        "  /borrar_ubicacion — Eliminar una ubicación\n"
        "  /cancel — Cancelar operación actual",
        parse_mode="HTML",
    )


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data.clear()
    await update.message.reply_text("Cancelado.", reply_markup=ReplyKeyboardRemove())
    return ConversationHandler.END


# ─── Lifecycle ────────────────────────────────────────────────────────────────

async def post_init(application: Application) -> None:
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=5)
    application.bot_data["db_pool"] = pool
    logger.info("Conectado a PostgreSQL")

    await application.bot.set_my_commands([
        BotCommand("start",            "Bienvenida e instrucciones"),
        BotCommand("add_location",     "Guardar una ubicación para monitorear"),
        BotCommand("mis_ubicaciones",  "Ver tus ubicaciones guardadas"),
        BotCommand("borrar_ubicacion", "Eliminar una ubicación guardada"),
        BotCommand("cancel",           "Cancelar la operación actual"),
    ])
    logger.info("Comandos registrados en Telegram")


async def post_shutdown(application: Application) -> None:
    pool: asyncpg.Pool | None = application.bot_data.get("db_pool")
    if pool:
        await pool.close()


# ─── Entry point ──────────────────────────────────────────────────────────────

def main() -> None:
    application = (
        Application.builder()
        .token(TELEGRAM_TOKEN)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )

    add_location_conv = ConversationHandler(
        entry_points=[CommandHandler("add_location", add_location)],
        states={
            WAITING_LOCATION: [MessageHandler(filters.LOCATION, receive_location)],
            WAITING_LABEL: [
                CommandHandler("skip", skip_label),
                MessageHandler(filters.TEXT & ~filters.COMMAND, receive_label),
            ],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
        allow_reentry=True,
    )

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("mis_ubicaciones", mis_ubicaciones))
    application.add_handler(CommandHandler("borrar_ubicacion", borrar_ubicacion))
    application.add_handler(CallbackQueryHandler(handle_delete_callback, pattern=r"^del:"))
    application.add_handler(add_location_conv)
    # Debe ir último — captura cualquier comando no manejado por los anteriores
    application.add_handler(MessageHandler(filters.COMMAND, unknown_command))

    logger.info("Bot iniciado, esperando mensajes...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
