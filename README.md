# Servicio de Autenticación y Gestión de Usuarios (auth-service)

Este servicio de NestJS proporciona funcionalidades robustas para la gestión de usuarios y autenticación, incluyendo características de seguridad avanzadas como rate limiting, protección contra ataques de fuerza bruta y un sistema de auditoría.

## Estructura del Proyecto

```
auth-service/
├─ src/
│  ├─ main.ts                     # Punto de entrada de la aplicación
│  ├─ app.module.ts               # Módulo raíz de NestJS
│  ├─ common/                     # Módulos compartidos (filtros, guards, decorators)
│  │   ├─ http-exception.filter.ts # Filtro global de excepciones para manejo de errores
│  │   ├─ roles.decorator.ts
│  │   └─ roles.guard.ts
│  ├─ users/                      # Módulo de gestión de usuarios
│  │   ├─ users.module.ts
│  │   ├─ users.controller.ts     # Lógica de negocio para usuarios
│  │   ├─ users.service.ts        # Interacción con la base de datos de usuarios
│  │   ├─ schemas/user.schema.ts  # Definición del esquema de usuario (Mongoose)
│  │   ├─ schemas/audit.schema.ts # Definición del esquema de auditoría (Mongoose)
│  │   ├─ dto/create-user.dto.ts
│  │   └─ dto/update-user.dto.ts
│  └─ auth/                       # Módulo de autenticación
│      ├─ auth.module.ts
│      ├─ auth.service.ts         # Lógica de autenticación, seguridad (fuerza bruta)
│      ├─ auth.controller.ts      # Endpoints de autenticación (login, register)
│      ├─ jwt-auth.guard.ts       # Guard para proteger rutas con JWT
│      ├─ jwt.strategy.ts         # Estrategia para validar JWT
│      ├─ local-auth.guard.ts     # Guard para autenticación local (email/password)
│      └─ local.strategy.ts       # Estrategia para validar credenciales locales
├─ package.json
├─ tsconfig.json
├─ Dockerfile
├─ docker-compose.yml
└─ .env                            # Variables de entorno
└─ logs/
   └─ application-*.log
```
## Conceptos Importantes

### 1. Gestión de Usuarios (`users` module)

*   **CRUD Completo**: Permite crear, leer, actualizar y eliminar (soft delete) usuarios.
*   **Roles**: Los usuarios tienen roles (`user`, `admin`, `super-admin`, `basic`) que controlan el acceso a ciertas funcionalidades.
*   **Soft Delete**: Los usuarios no se eliminan permanentemente de la base de datos, sino que se marcan como `deleted: true`.
*   **Estadísticas**: Endpoint para obtener métricas sobre la base de usuarios (total, creados recientemente, activos, eliminados, etc.).

### 2. Autenticación (`auth` module)

*   **Registro (`/auth/register`)**: Permite a nuevos usuarios crear una cuenta.
*   **Login (`/auth/login`)**: Autentica a los usuarios y devuelve un JSON Web Token (JWT).
*   **JWT**: Se utiliza para mantener la sesión del usuario y autorizar el acceso a rutas protegidas.
*   **Estrategias de Passport**: Implementa `LocalStrategy` para la autenticación con email/contraseña y `JwtStrategy` para la validación de tokens.

### 3. Seguridad

*   **Rate Limiting**: Implementado con `@nestjs/throttler` para limitar el número de solicitudes por IP en un período de tiempo, especialmente en el endpoint de login para prevenir ataques de fuerza bruta.
*   **Protección contra Fuerza Bruta**:
    *   El esquema de usuario (`UserSchema`) incluye `failedLoginAttempts` y `lockoutUntil`.
    *   Después de un número configurable de intentos fallidos de login (ej. 5), la cuenta se bloquea por un período de tiempo (ej. 15 minutos).
    *   Los intentos exitosos de login resetean el contador de intentos fallidos.
*   **Auditoría (`AuditSchema`)**: Se registran eventos importantes en una colección `audits` separada, incluyendo:
    *   Creación, actualización y eliminación de usuarios.
    *   Intentos de login (exitosos y fallidos).
    *   Bloqueos de cuenta por fuerza bruta, registrando IP, hora y motivo.

### 4. Manejo de Errores Centralizado

*   **`AllExceptionsFilter`**: Un filtro de excepciones global (`src/common/http-exception.filter.ts`) captura todas las excepciones HTTP lanzadas en la aplicación.
*   **Formato de Respuesta Estandarizado**: Todas las respuestas (éxito y error) siguen un formato consistente:
    ```json
    // Respuesta exitosa
    {
      "statusCode": 200,
      "message": "Operación exitosa",
      "data": { /* ... */ }
    }

    // Respuesta de error
    {
      "statusCode": 400,
      "timestamp": "2023-10-27T10:30:00.000Z",
      "path": "/api/users",
      "method": "POST",
      "error": {
        "statusCode": 400,
        "message": "Email already registered",
        "error": "Bad Request"
      }
    }
    ```

### 5. Logging

*   **Logs de Errores**: Todos los errores capturados por el `AllExceptionsFilter` se registran en un archivo de log (`logs/application-%DATE%.log`) utilizando Winston.
*   **Logs de Seguridad**: Los intentos de fuerza bruta y otros eventos de seguridad se registran tanto en el log de archivos como en la colección `audits` de MongoDB, incluyendo detalles como IP, hora y motivo del ataque.

## Cómo Levantar el Proyecto

1. **Clonar el repositorio**:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd auth-service
   ```
2. **Configurar variables de entorno**:
   Crea un archivo `.env` en la raíz del proyecto a partir del `.env.example` (si existe) o con las siguientes variables:
   ```
   PORT=8082
   MONGO_URI=urlconexionmongo
   JWT_SECRET=keydefinida
   SALT_ROUNDS=10
   ```
   *Nota: `MONGO_URI` usa el nombre del servicio de Docker (`mongo`). Si ejecutas localmente sin Docker, cámbialo a `mongodb://localhost:27017/authdb`.*

### 3. Ejecutar con Docker (Recomendado)

```bash
# Levantar todos los servicios en segundo plano
docker-compose up -d

# Ver logs del servicio de autenticación
docker-compose logs -f auth-service

# Detener y eliminar los contenedores
docker-compose down
```

### 4. Ejecutar en Desarrollo (Local)

1.  **Instalar dependencias**:
    ```bash
    npm install
    ```
2.  **Iniciar en modo desarrollo (con hot-reload)**:
    ```bash
    npm run start:dev
    ```

### 5. Ejecutar en Producción (Local)

1.  **Construir la aplicación**:
    ```bash
    npm run build
    ```
2.  **Iniciar la aplicación compilada**:
    ```bash
    npm run start:prod
    ```

#### Opcional: Usando PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar la aplicación con PM2
pm2 start dist/main.js --name "auth-service"

# Iniciar con variables de entorno específicas
NODE_ENV=production PORT=8082 MONGO_URI=mongodb://localhost:27017/authdb pm2 start dist/main.js --name "auth-service"
```

## Rutas y Pruebas con Postman

Todas las rutas protegidas con JWT requieren un header `Authorization: Bearer <your_jwt_token>`.

### 1. Registro de Usuario

*   **Ruta**: `POST http://localhost:8082/api/auth/register`
*   **Body (raw, JSON)**:
    ```json
    {
      "name": "Juan",
      "surname": "Perez",
      "age": 30,
      "birthDate": "1993-01-15T00:00:00.000Z",
      "email": "juan.perez@example.com",
      "password": "password123",
      "role": "user"
    }
    ```
*   **Respuesta Exitosa**: `statusCode: 201`, `message: "User registered successfully"`, `data: { ...userWithoutPassword }`

### 2. Login de Usuario

*   **Ruta**: `POST http://localhost:8082/api/auth/login`
*   **Body (raw, JSON)**:
    ```json
    {
      "email": "juan.perez@example.com",
      "password": "password123"
    }
    ```
*   **Respuesta Exitosa**: `statusCode: 200`, `message: "Login successful"`, `data: { "access_token": "your_jwt_token_here" }`
*   **Notas**: Este endpoint está protegido por rate limiting (5 intentos por minuto por IP) y bloqueo de cuenta (5 intentos fallidos bloquean la cuenta por 15 minutos). Los intentos fallidos y bloqueos se auditan.

### 3. Crear Usuario (Protegida, Rol: admin)

*   **Ruta**: `POST http://localhost:8082/api/users`
*   **Headers**: `Authorization: Bearer <your_jwt_token>` (el token debe ser de un usuario con `role: "admin"`)
*   **Body (raw, JSON)**:
    ```json
    {
      "name": "Nuevo Usuario",
      "surname": "Por Admin",
      "age": 25,
      "birthDate": "1998-01-15T00:00:00.000Z",
      "email": "nuevo.usuario@example.com",
      "password": "password456",
      "role": "user"
    }
    ```
*   **Respuesta Exitosa**: `statusCode: 201`, `message: "User created successfully"`, `data: { ...userWithoutPassword }`

### 4. Obtener Usuario Actual (Protegida)

*   **Ruta**: `GET http://localhost:8082/api/users/me`
*   **Headers**: `Authorization: Bearer <your_jwt_token>`
*   **Respuesta Exitosa**: `statusCode: 200`, `message: "User retrieved successfully"`, `data: { ...currentUserDetails }`

### 5. Obtener Todos los Usuarios (Protegida, Rol: admin)

*   **Ruta**: `GET http://localhost:8082/api/users`
*   **Headers**: `Authorization: Bearer <your_jwt_token>` (el token debe ser de un usuario con `role: "admin"`)
*   **Respuesta Exitosa**: `statusCode: 200`, `message: "Users retrieved successfully"`, `data: [ { ...user1 }, { ...user2 } ]`

### 6. Actualizar Usuario (Protegida)

*   **Ruta**: `PUT http://localhost:8082/api/users/:id` (reemplaza `:id` con el ID del usuario)
*   **Headers**: `Authorization: Bearer <your_jwt_token>`
*   **Body (raw, JSON)**:
    ```json
    {
      "name": "Juan Actualizado",
      "role": "user"
    }
    ```
*   **Respuesta Exitosa**: `statusCode: 200`, `message: "User updated successfully"`, `data: { ...updatedUserDetails }`

### 7. Eliminar Usuario (Soft Delete, Protegida)

*   **Ruta**: `DELETE http://localhost:8082/api/users/:id` (reemplaza `:id` con el ID del usuario)
*   **Headers**: `Authorization: Bearer <your_jwt_token>`
*   **Respuesta Exitosa**: `statusCode: 200`, `message: "User deleted successfully"`, `data: { "success": true }`

### 8. Obtener Usuarios Eliminados (Protegida, Rol: admin)

*   **Ruta**: `GET http://localhost:8082/api/users/deleted`
*   **Headers**: `Authorization: Bearer <your_admin_jwt_token>`
*   **Respuesta Exitosa**: `statusCode: 200`, `message: "Deleted users retrieved successfully"`, `data: [ { ...user1 }, { ...user2 } ]`

### 9. Restaurar Usuario (Protegida, Rol: admin)

*   **Ruta**: `PUT http://localhost:8082/api/users/:id/restore` (reemplaza `:id` con el ID del usuario eliminado)
*   **Headers**: `Authorization: Bearer <your_admin_jwt_token>`
*   **Respuesta Exitosa**: `statusCode: 200`, `message: "User restored successfully"`, `data: { ...restoredUserDetails }`

### 10. Bloquear Usuario (Protegida, Rol: admin)

*   **Ruta**: `PUT http://localhost:8082/api/users/:id/block` (reemplaza `:id` con el ID del usuario)
*   **Headers**: `Authorization: Bearer <your_admin_jwt_token>`
*   **Respuesta Exitosa**: `statusCode: 200`, `message: "User blocked successfully"`, `data: { "success": true, "isBlocked": true }`
*   **Notas**: Un usuario bloqueado no podrá iniciar sesión.

### 11. Desbloquear Usuario (Protegida, Rol: admin)

*   **Ruta**: `PUT http://localhost:8082/api/users/:id/unblock` (reemplaza `:id` con el ID del usuario bloqueado)
*   **Headers**: `Authorization: Bearer <your_admin_jwt_token>`
*   **Respuesta Exitosa**: `statusCode: 200`, `message: "User unblocked successfully"`, `data: { "success": true, "isBlocked": false }`

### 12. Obtener Usuarios Bloqueados (Protegida, Rol: admin)

*   **Ruta**: `GET http://localhost:8082/api/users/blocked`
*   **Headers**: `Authorization: Bearer <your_admin_jwt_token>`
*   **Respuesta Exitosa**: `statusCode: 200`, `message: "Blocked users retrieved successfully"`, `data: [ { ...user1 }, { ...user2 } ]`
*   **Notas**: Devuelve una lista de todos los usuarios que tienen la propiedad `isBlocked` en `true`.

### 13. Estadísticas de Usuarios (Protegida, Rol: admin)

*   **Ruta**: `GET http://localhost:8082/api/users/stats`
*   **Headers**: `Authorization: Bearer <your_jwt_token>` (el token debe ser de un usuario con `role: "admin"`)
*   **Respuesta Exitosa**: `statusCode: 200`, `message: "Stats retrieved successfully"`, `data: { totalUsers: ..., createdLastWeek: ..., deleted: ..., blocked: ..., etc. }`

## Manejo de Logs

### Logs de Errores

Los errores de la aplicación se registran en archivos de log rotativos. Puedes encontrar estos archivos en la carpeta `logs/` en la raíz del proyecto.

*   **Ubicación**: `logs/application-YYYY-MM-DD.log`
*   **Formato**: JSON, incluyendo timestamp, nivel de log, mensaje de error y stack trace.

### Logs de Seguridad y Auditoría

Los eventos de seguridad, como intentos de login fallidos y bloqueos de cuenta, así como las operaciones CRUD sobre usuarios, se registran en la colección `audits` de tu base de datos MongoDB.

*   **Base de Datos**: `authdb` (o el nombre configurado en `MONGO_URI`)
*   **Colección**: `audits`
*   **Contenido**: Cada documento de auditoría incluye la acción, el actor (si aplica), el usuario objetivo, cambios realizados, notas y la IP de origen en caso de ataques.

---
## Scripts de Mantenimiento

### Backup de Base de Datos

```bash
# Backup
docker exec mongo mongodump --db auth-service --out /backup/$(date +%Y%m%d)

# Restore
docker exec mongo mongorestore --db auth-service /backup/20240115/auth-service
```
### Backup de Base de Datos

```bash
# Limpiar logs mayores a 30 días
find ./logs -name "*.log" -mtime +30 -delete
```
