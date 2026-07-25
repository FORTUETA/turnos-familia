# Turnos Familia PWA

PWA semanal compartida con 7 columnas y 24 filas. Los cambios se sincronizan mediante Firebase Firestore.

## 1. Crear Firebase

1. En Firebase Console, crea un proyecto.
2. Activa Firestore Database.
3. Registra una aplicación web.
4. Copia las credenciales en un archivo `.env` usando `.env.example`.

Reglas mínimas para una prueba familiar sin acceso privado:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /weeks/{week}/slots/{slot} {
      allow read, write: if true;
    }
  }
}
```

Importante: estas reglas permiten editar a cualquiera que tenga el enlace. Para uso privado real conviene añadir autenticación.

## 2. Ejecutar

```bash
npm install
npm run dev
```

## 3. Publicar en Vercel

1. Sube la carpeta a GitHub.
2. Importa el repositorio en Vercel.
3. Añade en Vercel las variables del archivo `.env`.
4. Pulsa Deploy.

## 4. Instalar en Android

Abre la web en Chrome y usa:
Menú → Añadir a pantalla de inicio / Instalar aplicación.
