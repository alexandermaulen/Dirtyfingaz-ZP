/* Configuración del cliente DIRTYFINGAZ ZP.
   apiBase: URL base del Worker de Cloudflare que atiende /api/radio/*.
   - Vacío ("") = mismo origen (Worker con assets o desarrollo local).
   - En GitHub Pages: pon aquí la URL del Worker, por ejemplo
     "https://dirtyfingaz-zp.<tu-subdominio>.workers.dev" (sin barra final). */
window.ZP_CONFIG = { apiBase: "" };
