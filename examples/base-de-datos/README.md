# Instala python

# En la terminal y en el directorio del servidor

## Iniciar ambiente // Esto hay que hacerlo cada vez que ejecutemos la app

. .venv/bin/activate (esto en linux)
.venv\Scripts\Activate (esto en Windows)

# ::Windows::

-  entrar en una terminal nueva, entrar en la carpeta con el ambiente venv 
-  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
-  .venv\Scripts\Activate.ps1


-  pip install Flask flask_cors

## Iniciar servidor de flask

flask --app baseDeDatos run --host=0.0.0.0

- cambiar IP en admin, cliente y projector


Todos los días hacer lo que tiene ##