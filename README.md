# 📱 DriveSmart Móvil

![Portada del proyecto](./assets/login.png)

Aplicación móvil desarrollada con **React Native** para la gestión inteligente de estacionamientos, visualización de restricciones y estadísticas urbanas, integrada con un backend en Node.js y PostgreSQL.

---

## 📋 Tabla de Contenidos

* [Características](#-características)
* [Tecnologías](#-tecnologías)
* [Instalación](#-instalación)
* [Uso](#-uso)
* [Capturas](#-capturas)
* [Estructura de Carpetas](#-estructura-de-carpetas)
* [Licencia](#-licencia)

---

## ✨ Características

* Módulo de autenticación de usuarios.
* Visualización de mapas con restricciones y capas personalizadas.
* Panel de estadísticas desde datos geoespaciales.
* Backend API REST con Express y PostgreSQL.
* Código nativo (`android/` y `ios/`) excluido para facilitar distribución multiplataforma.

---

## 🛠 Tecnologías

* **Móvil:** React Native (CLI)
* **Backend:** Node.js, Express, PostgreSQL
* **Gestión de entorno:** dotenv
* **Mapas:** React Native Maps o equivalente
* **Estadísticas:** Datos en tiempo real desde la base de datos

---

## 🔧 Instalación

1. Clona el repositorio:

   git clone https://github.com/Fernando-Estivariz/DriveSmart-Movil.git
   cd DriveSmart-Movil

2. Crea los archivos de entorno:
    cp DriveSmart/.env.example DriveSmart/.env
    cp server/.env.example server/.env

3. Instala las dependencias:
    cd DriveSmart && npm install
    cd ../server && npm install

4. Inicia el backend:
    cd server
    node index.js

5. Ejecuta la app móvil:
    cd ../DriveSmart
    npx react-native run-android  # o run-ios si estás en Mac

## 🚀 Uso
    -Backend disponible en: http://localhost:4000

    -App móvil disponible en emulador o dispositivo físico conectado

## 📸 Capturas

<p align="center">
  <img src="./assets/login.png" alt="Pantalla Login" width="300" />
  <img src="./assets/carga.png" alt="Pantalla Dashboard" width="300" />
  <img src="./assets/carga.png" alt="Mapa interactivo" width="300" />
  <img src="./assets/registrate.png" alt="Mapa Estadisticas" width="300" />
</p>

## 🗂 Estructura de Carpetas

```text
DriveSmart-Movil/
├─ DriveSmart/              # React Native app
│  ├─ src/
│  ├─ .env.example
│  └─ App.js, etc.
├─ server/                  # Backend Node + PostgreSQL
│  ├─ db/
│  ├─ routes/
│  ├─ .env.example
│  └─ index.js
├─ assets/                  # Capturas, portadas, íconos
│  ├─ drivesmart-mobile-cover.png
│  ├─ login-mobile.png
│  ├─ mapa-mobile.png
│  └─ estadisticas-mobile.png
├─ .gitignore
└─ README.md