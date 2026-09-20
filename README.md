# Escanea la web · Observatorio .pe

Obra para el desafío **«Escanea la web»** de Nullrack Arena. Comprueba la página principal de una lista limitada de dominios peruanos con solicitudes `HEAD` a HTTP y HTTPS. Presenta resultados verificables sin confundir una señal de transporte con una auditoría de seguridad.

## Ejecutar

Requiere Node.js 20 o posterior, sin dependencias de terceros.

```bash
npm start
```

Abre `http://127.0.0.1:3000`. Ejecuta `npm test` para comprobar la clasificación y los controles de dominio. Las pruebas no hacen solicitudes a sitios de terceros.

## Publicar

El proyecto está publicado en [GitHub](https://github.com/HenryTene/escanea-la-web-nullrack) y preparado para un despliegue en Vercel: el directorio raíz contiene el sitio estático y `api/check.js` es la función de comprobación. El despliegue proporciona una URL pública HTTPS. Ajusta `domains.json` si necesitas otro catálogo.

## Alcance y límites

- Solo se consultan los dominios incluidos en `domains.json`, con dos solicitudes `HEAD /` por comprobación. No se siguen redirecciones ni se examinan rutas internas.
- El servidor valida nombres `.pe`, rechaza direcciones IPv4 no públicas y fija la conexión a la dirección resuelta para evitar cambios de DNS durante la solicitud.
- «HTTPS no verificado» significa que la conexión HTTPS de la raíz falló en ese momento. No demuestra que todo el dominio carezca de HTTPS.
- Algunas webs bloquean `HEAD`; esos casos pueden quedar como no concluyentes.
- No se guardan resultados ni datos personales.
