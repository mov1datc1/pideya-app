# Manual PideYa: Antigravity → Expo EAS → Google Play

Revisado el 21 de octubre de 2026. Alcance: **app cliente, AAB y pruebas internas**. El formato correcto es `.aab` (Android App Bundle).

## 1. Qué está conectado y qué falta

| Elemento | Resultado de esta revisión |
| --- | --- |
| EAS CLI en este Mac | Instalado: 18.4.0; anuncia una actualización disponible |
| Sesión de Expo | `eas whoami` confirmó `pideya1` |
| Proyecto cliente | `pide-ya`, ID `db0d6965-cc3c-4c5f-bb2e-ef3058b3fde7` |
| Paquete Android | `com.movidatci.pideya` |
| Repositorio | `https://github.com/mov1datc1/pideya-app` |
| Compilación | Perfil `production`, AAB, incremento remoto de versión |
| Envío | Perfil `internal`, canal `internal`, estado `completed`, preparado localmente |
| Automatización GitHub | Archivo local `.eas/workflows/android-play.yml`, rama `develop` |
| Permisos Google Play e integración GitHub en Expo | No verificados en las consolas remotas |
| Primera entrega con este flujo | Pendiente; este manual no ejecutó builds ni submissions |

La terminal de Antigravity puede usar EAS CLI igual que la de este entorno si abre el mismo proyecto y usa el mismo usuario del Mac. No hace falta un conector especial para ejecutar esos comandos. La sesión de Expo permite operar EAS; la cuenta de servicio de Google permite que EAS envíe versiones a Play. Ver builds no demuestra que la segunda conexión exista.

Flujo objetivo:

```text
Push a develop
  → validación de variables, TypeScript, pruebas y Expo Doctor
  → EAS Build genera el AAB
  → EAS Submit envía ESE build
  → Google Play: pruebas internas
  → comprobar la app
  → elegir una versión para pruebas cerradas
```

## 2. Verificar EAS desde Antigravity

Abre la terminal integrada y ejecuta:

```sh
cd /Users/jonathanpalacios/Downloads/Pideya-app/pideya-app
eas --version
eas whoami
```

Debe aparecer `pideya1`. Si no hay sesión, ejecuta `eas login` e inicia sesión con tu cuenta de Expo. Si Antigravity no encuentra `eas`, instala la CLI en su entorno con `npm install --global eas-cli` y vuelve a abrir la terminal. También puedes actualizar así la versión instalada antes de usar Workflows.

Comprueba el proyecto y las compilaciones:

```sh
eas project:info
eas build:list --platform android --limit 5
```

Contrasta el ID con la tabla anterior. No ejecutes `eas init` para crear otro proyecto. Conserva el paquete y las credenciales de firma de la aplicación que ya subes a Play. [Configuración y autenticación de EAS](https://docs.expo.dev/submit/android/).

## 3. Crear la identidad de Google para los envíos

Si ya existe una cuenta de servicio asignada a EAS Submit, verifica sus permisos en el paso 4 y reutilízala.

1. Abre [Google Cloud Console](https://console.cloud.google.com/). Selecciona un proyecto tuyo existente o crea uno para PideYa.
2. Abre la [Google Play Android Developer API](https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com) y pulsa **Habilitar**.
3. Ve a **IAM y administración → Cuentas de servicio → Crear cuenta de servicio**.
4. Usa un nombre identificable, por ejemplo `pideya-play-submit`. Para este uso, los permisos sobre la app se conceden en Play Console; no necesitas convertirla en propietaria del proyecto Cloud.
5. Copia su correo, terminado en `iam.gserviceaccount.com`.
6. Abre esa cuenta → **Claves → Añadir clave → Crear clave → JSON**. Guarda el archivo fuera del repositorio; se cargará en EAS en el paso 5.

Google ya no exige vincular la cuenta de desarrollador a un proyecto Cloud como paso separado. [Guía de Google](https://developers.google.com/android-publisher/getting_started). [Guía visual de Expo para generar la clave](https://github.com/expo/fyi/blob/main/creating-google-service-account.md).

## 4. Dar acceso a tu app en Play Console

1. Entra con el propietario o administrador en [Google Play Console](https://play.google.com/console/).
2. Abre **Usuarios y permisos → Invitar nuevos usuarios**.
3. Introduce el correo de la cuenta de servicio, no tu correo personal.
4. En **Permisos de aplicaciones**, añade únicamente PideYa cliente, `com.movidatci.pideya`.
5. Para este flujo de una app existente, concede **Ver información de la aplicación (solo lectura)** y **Lanzar aplicaciones en canales de pruebas**. Conserva los permisos dependientes que marque la consola.
6. Pulsa **Invitar usuario**. No necesitas abrir un buzón para aceptar como cuenta de servicio.

El permiso de pruebas permite subir y lanzar versiones en esos canales. No hace falta conceder administración global, datos financieros ni lanzamiento a producción para el objetivo de este manual. Si después automatizas la gestión de listas de testers o la ficha, revisa los permisos específicos de esas operaciones. [Permisos oficiales de Google Play](https://support.google.com/googleplay/android-developer/answer/9844686?hl=en).

## 5. Cargar la clave en EAS Submit

1. Abre [Expo: PideYa cliente](https://expo.dev/accounts/pideya1/projects/pide-ya).
2. Entra en **Credentials → Android** y selecciona `com.movidatci.pideya`.
3. En **Service credentials**, busca **Google service account key for EAS Submit**.
4. Pulsa **Add a Google service account key → Upload new key**.
5. Selecciona el JSON del paso 3 y guarda. Si ya hay una clave válida, reutilízala.

Alternativa desde Antigravity:

```sh
eas credentials --platform android
```

Selecciona `production`, después **Google Service Account → Manage your Google Service Account Key for Play Store Submissions**, y configura la clave. Es la credencial de **Submit**; una credencial de FCM para notificaciones no demuestra acceso a Play. No pegues el JSON en chats ni lo añadas a Git. [Instrucciones de EAS Submit](https://docs.expo.dev/submit/android/).

## 6. Confirmar el destino interno

En el `eas.json` actual ya está preparado:

```json
"submit": {
  "internal": {
    "android": {
      "track": "internal",
      "releaseStatus": "completed"
    }
  },
  "production": {}
}
```

`build.production` genera el AAB; `submit.internal` selecciona pruebas internas. El nombre del perfil de build no publica por sí mismo en producción. `completed` solicita lanzar la entrega en el canal elegido; `draft` deja una intervención manual pendiente. [Automatización de envíos](https://docs.expo.dev/build/automate-submissions/).

## 7. Primera comprobación, sin descargar el AAB

Puedes probar la conexión con un build **ya terminado en EAS que todavía no hayas subido a Play**. Copia su ID desde EAS y sustituye `ID_DEL_BUILD`:

```sh
eas submit --platform android --profile internal --id ID_DEL_BUILD
```

Si ese versionCode ya está en Play, no vuelvas a subirlo. Para una compilación nueva y envío automático, ejecuta lo siguiente únicamente cuando Expo Doctor haya terminado correctamente:

```sh
npx expo-doctor
```

```sh
eas build --platform android --profile production --auto-submit-with-profile internal
```

El segundo comando programa el envío cuando termine satisfactoriamente la compilación. Lanzar un `eas build` normal **no activa automáticamente Submit**. Usa este comando cuando trabajes desde Antigravity, o el workflow del paso 8. No ejecutes ambos para una misma entrega. [Build con auto-submit](https://docs.expo.dev/build/automate-submissions/).

## 8. Automatizar también el inicio con cada push

1. En el proyecto Expo, abre **Project settings → GitHub** (el nombre puede aparecer como GitHub settings).
2. Conecta GitHub e instala/autoriza la aplicación de Expo para el repositorio `mov1datc1/pideya-app`.
3. Selecciona ese repositorio. La raíz de la app es la raíz del repositorio; `pideya-driver` es otra aplicación.
4. Conserva `.eas/workflows/android-play.yml`. Ya escucha pushes a `develop` y encadena validación → build → submit interno. No configures además otro disparador de compilación para el mismo push.
5. Publica el workflow y `eas.json`, junto con los cambios revisados que quieras probar, mediante commit y push a `develop`.
6. Abre **Workflows** en Expo. Comprueba la ejecución asociada al commit enviado.

Un commit local no dispara nada. El push sí lo hace, una vez conectada la integración. La ejecución en EAS no depende de mantener abierto Antigravity ni el Mac. [Conectar GitHub y EAS Workflows](https://docs.expo.dev/eas/workflows/get-started/).

Antes del primer push, configura en Expo → **Environment variables**, entorno **production**:

| Variable | Contenido |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase del cliente |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon; nunca service_role |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Clave Maps del cliente |

El workflow comprueba que existan. Deben estar disponibles tanto para validación como para build; usa visibilidad plain text o sensitive para estos valores públicos. El `.env` del Mac no estará en el checkout de GitHub. Mantén las restricciones Android de Maps compatibles con la firma de Play.

Los flags `EXPO_PUBLIC_NOTIFICATION_V2` y `EXPO_PUBLIC_NOTIFICATION_PROVIDER` deben corresponder al backend realmente desplegado. Este flujo no instala migraciones ni despliega el worker. Estas condiciones provienen de la configuración local de PideYa.

## 9. Comprobar el resultado completo

No basta con ver el build verde:

1. En EAS, el build debe terminar correctamente.
2. En **Submissions**, el envío también debe terminar correctamente.
3. En Play Console → PideYa → **Probar y publicar → Pruebas → Prueba interna**, comprueba el versionCode recibido.
4. En la sección de testers, añade tu cuenta de Google a la lista/grupo configurado y usa el enlace de participación.
5. En el Redmi, abre ese enlace con la misma cuenta y actualiza desde Play Store.
6. Prueba arranque, login, Maps, pedidos y notificaciones.

La distribución puede tardar; los requisitos y revisiones de Google siguen aplicando. Las pruebas internas admiten hasta 100 testers. [Configuración de pruebas de Google Play](https://support.google.com/googleplay/android-developer/answer/9845334?hl=es).

## 10. Pasar de internas a cerradas

El flujo automático termina en internas. Cuando elijas una versión estable:

1. En Play Console, entra en **Pruebas cerradas** y crea o abre el canal.
2. Configura sus testers, países y requisitos pendientes.
3. Crea una versión y usa **Añadir de la biblioteca** para seleccionar el AAB ya recibido, comprobando su versionCode.
4. Completa notas, revisa y envía la versión siguiendo las indicaciones de la consola.

No necesitas descargar y volver a subir el archivo para reutilizarlo. [Preparar versiones con bundles existentes](https://support.google.com/googleplay/android-developer/answer/9859348?hl=es).

Si tu cuenta es **personal y fue creada después del 13 de noviembre de 2023**, Google exige una prueba cerrada con al menos **12 testers inscritos continuamente durante 14 días** antes de solicitar acceso a producción. Las pruebas internas no sustituyen ese requisito. No hemos verificado el tipo ni la fecha de tu cuenta: manda lo indicado por tu Play Console. [Requisitos oficiales](https://support.google.com/googleplay/android-developer/answer/14151465?hl=es-us).

## 11. Si algo falla

Estas son comprobaciones de diagnóstico; hay que leer el error concreto antes de cambiar configuración.

| Síntoma | Qué comprobar |
| --- | --- |
| Build verde pero no hay envío | Que se usó auto-submit con perfil internal o el workflow completo |
| Envío 403 / permiso denegado | API habilitada, correo invitado, paquete correcto y permisos de pruebas |
| Clave de Submit ausente | Que el JSON esté asignado al identificador cliente en EAS Submit |
| versionCode ya utilizado | Si la entrega ya existe en Play; para otro binario, generar un nuevo build con versión superior |
| Firma incorrecta | Clave de carga existente y configuración de firma en Play; no regenerar claves a ciegas |
| App borrador / cambios pendientes | Completar tareas de Play Console; `draft` puede permitir guardar, pero no cumple el lanzamiento automático |
| No inicia después del push | Integración, repositorio, rama develop y archivo del workflow incluidos en el commit |
| Falla validación de variables | Entorno production de EAS y disponibilidad de las tres variables |

Si solo falla Submit, conserva el build y reintenta por su ID tras corregir la causa. No recompiles por rutina ni uses `--latest` si hay varias entregas simultáneas. Evita lanzar releases en paralelo: una versión nueva puede adelantarse a otra.

## 12. Dictar instrucciones desde el Mac

Para escribir aquí con voz aunque no veas un botón de micrófono:

1. Abre ** → Ajustes del Sistema → Teclado → Dictado**.
2. Activa Dictado y selecciona español y el micrófono.
3. Configura o consulta el atajo de Dictado en ese panel.
4. Vuelve al cuadro del mensaje, haz clic y activa el atajo. También puedes usar **Edición → Iniciar dictado** donde esté disponible.
5. Habla, termina el dictado, revisa el texto y envíalo.

Esto introduce texto en el campo activo. No depende de que Antigravity o este chat tenga un botón propio. [Instrucciones de Apple](https://support.apple.com/es-es/guide/mac-help/mh40584/mac).

La documentación de OpenAI distingue el dictado de la conversación de voz. En la app de escritorio ChatGPT documenta iniciar un chat nuevo y seleccionar **Voice** antes del primer mensaje. No he verificado tu interfaz ni la disponibilidad de ese control en la versión que estás usando. El dictado del Mac permite seguir en esta conversación. [OpenAI: uso de voz](https://developers.openai.com/training/walkthroughs/using-voice).
