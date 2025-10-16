from django.apps import AppConfig

# Use o nome do seu aplicativo (ex: 'usuarios')
class UsuariosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'usuarios' 

    def ready(self):
        # Importa o arquivo signals.py para registrar os sinais no Django
        # O caminho completo (usuarios.signals) deve ser usado aqui.
        import usuarios.signals