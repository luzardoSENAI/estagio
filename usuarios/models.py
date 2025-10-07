from django.contrib.auth.models import User
from django.db import models
from django.dispatch import receiver
import uuid
from django.db.models.signals import post_save

class Usuario(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='usuario')
    
    CARGOS = (
        ('estagiario', 'Estagiário'),
        ('gestor', 'Gestor'),
        ('admin','Admin')
    )
    cargo = models.CharField(max_length=20, choices=CARGOS, default='estagiario')
    nome = models.CharField(max_length=100, blank=True, null=True)
    cpf = models.CharField(max_length=14, unique=True, blank=True, null=True)
    data_nascimento = models.DateField(blank=True, null=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    endereco = models.TextField(blank=True, null=True)
    
    image = models.ImageField(default='profile_pics/default.png', upload_to='profile_pics')
    
    @property
    def foto_perfil(self):
        if self.image:
            return self.image.url
        return "/static/imagens/default.jpg"
    
    uuid=models.UUIDField(default=uuid.uuid4)

    turma_escola = models.ForeignKey(
        'instituicoes.Turma',
        on_delete=models.SET_NULL,
        related_name='turma_escola',
        blank=True,
        null=True,
        limit_choices_to={'instituicao__tipo': 'escola'}
    )
    
    turma_empresa = models.ForeignKey(
        'instituicoes.Turma',
        on_delete=models.SET_NULL,
        related_name='turma_empresa',
        blank=True,
        null=True,
        limit_choices_to={'instituicao__tipo': 'empresa'}
    )
    
    def __str__(self):
        return f'{self.user.username} - {self.cargo}'

@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Usuario.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_profile(sender, instance, **kwargs):
    instance.usuario.save()
    


class Registro(models.Model):
    estagiario = models.ForeignKey(Usuario, on_delete=models.CASCADE,limit_choices_to={'cargo': 'estagiario'})
    instituicao = models.ForeignKey('instituicoes.Instituicao', on_delete=models.CASCADE)
    data = models.DateField(auto_now_add=True)
    hora_registro = models.TimeField()
    turma = models.ForeignKey(
        'instituicoes.Turma',
        on_delete=models.SET_NULL,
        related_name='turma_registro',
        blank=True,
        null=True,
    )
    status = models.CharField(max_length=20, choices=[
        ('presente', 'Presente'),
        ('atrasado', 'Atrasado'),
        ('invalido', 'Inválido'),
    ])
    justificado = models.BooleanField(default=True)
    def __str__(self):
        return f'{self.estagiario}, {self.data}, {self.hora_registro}, {self.status}, {self.turma}'