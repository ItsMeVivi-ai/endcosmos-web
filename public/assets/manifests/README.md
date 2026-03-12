# Gallery Manifests

Estos manifiestos permiten cambiar imagenes sin editar HTML largo.

## Archivos

- `home-gallery.json`: slides de la home (`/`).
- `zogs-gallery.json`: secciones completas de `/zogs`.
- `image-data-packages.json`: paquetes generales de imagenes por directorio (`/assets/images`, `/assets/zogs/*`).
- `world-systems.json`: sistemas del mundo para `/world` y modulos de universo.
- `endcosmos-images-workspace.json`: inventario total de imagenes del workspace (respaldo de libreria).

## Flujo rapido

1. Agrega/quita imagenes en `public/assets/zogs`, `public/assets/zogs/v1`, `public/assets/zogs/v2`, `public/assets/zogs/catalog`.
2. Ejecuta:

```bash
python backend/scripts/generate_gallery_manifests.py
```

3. Despliega.

## Notas

- La home usa el manifiesto y conserva fallback en HTML por resiliencia.
- El generador de `home-gallery.json` prioriza imagenes premium de `public/assets/images` y luego completa con `public/assets/zogs/imported-assets`, `public/assets/zogs/v1` y `public/assets/zogs/v2` para tener una rotacion mucho mas amplia.
- `/zogs` renderiza la galeria desde `zogs-gallery.json`.
- `image-data-packages.json` incluye metadatos (`id`, `title`, `count`, `items`) para consumo en frontend/admin.
- `mega-gallery.js` consume `image-data-packages.json` y usa `endcosmos-images-workspace.json` como fallback.
- `admin/dev` monitorea disponibilidad de todos los manifiestos en `healthTargets`.
- `world-systems.json` se consume en `universe.js`, `infinite-worlds.js` y `worlds-router.js`.
