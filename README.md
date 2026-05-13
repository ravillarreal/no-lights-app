# No Lights App — Sistema de Reportes de Cortes de Luz en Tiempo Real

Stack: **FastAPI** · **Redis Geo** · **React + Vite + Mapbox GL** · **Docker Compose**

## Requisitos previos

- Docker Engine >= 24 y Docker Compose V2 (`docker compose` sin guion)
- Fedora con SELinux activo (los volúmenes ya incluyen `:Z`)
- Token de Mapbox (gratuito): <https://account.mapbox.com/access-tokens/>

---

## Configuración inicial

**1. Agrega tu token de Mapbox en `docker-compose.yml`:**

```yaml
VITE_MAPBOX_TOKEN: "pk.eyJ1IjoiTU..."   # reemplaza el placeholder
```

---

## Despliegue

### Primera vez (construye imágenes e instala dependencias)

```bash
docker compose up --build
```

### Ejecuciones posteriores (imágenes ya construidas)

```bash
docker compose up
```

### En segundo plano

```bash
docker compose up --build -d
docker compose logs -f   # seguir logs en tiempo real
```

---

## Acceso

| Servicio  | URL                        |
|-----------|----------------------------|
| Frontend  | <http://localhost:3000>    |
| Backend   | <http://localhost:8000>    |
| API Docs  | <http://localhost:8000/docs> |

---

## Hot-reload

Ambos servicios tienen recarga en vivo:

- **Backend**: `uvicorn --reload` detecta cambios en `src/backend/`
- **Frontend**: Vite con `usePolling: true` detecta cambios en `src/frontend/`

Edita cualquier archivo y los cambios se aplican sin reiniciar los contenedores.

---

## Apagar y limpiar

```bash
# Solo apagar
docker compose down

# Apagar y borrar el volumen de node_modules (libera espacio)
docker compose down -v
```

---

## Notas sobre SELinux

El sufijo `:Z` en los volúmenes (`./src/backend:/app:Z`) le indica a Docker que
re-etiquete el contexto SELinux del directorio local como `container_file_t`,
permitiendo que el proceso dentro del contenedor lea y escriba los archivos.
Sin `:Z`, SELinux bloquea el acceso y el hot-reload no funciona en Fedora/RHEL.
