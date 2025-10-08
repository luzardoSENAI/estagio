from django.db import models
from multiselectfield import MultiSelectField
from datetime import date
from django.utils import timezone
import uuid

class Instituicao(models.Model):
    nome = models.CharField(max_length=100)
    endereco = models.CharField(max_length=100)
    INST_CHOICES = [
        ('escola', 'Escola'),
        ('empresa', 'Empresa'),
    ]
    tipo = models.CharField(max_length=10, choices=INST_CHOICES, blank=True)
    def __str__(self):
        return f'{self.nome}, ({self.get_tipo_display()})'

class Turma(models.Model):
    DIA_CHOICES = [
        ('segunda', 'Segunda-feira'),
        ('terça', 'Terça-feira'),
        ('quarta', 'Quarta-feira'),
        ('quinta', 'Quinta-feira'),
        ('sexta', 'Sexta-feira'),
        ('sabado', 'Sábado'),
        ('domingo', 'Domingo'),
    ]
    
    nome = models.CharField(max_length=100)
    dias_semana = MultiSelectField(choices=DIA_CHOICES, max_length=50)
    nome = models.CharField(max_length=100)

    data_inicio_ano = models.DateField()
    data_fim_ano = models.DateField()

    hora_entrada = models.TimeField()
    hora_saida = models.TimeField()

    instituicao = models.ForeignKey(
        Instituicao,
        on_delete=models.CASCADE,
        related_name='instituicao',
        blank=True,
        null=True
    )
    gestor = models.ForeignKey(
        "usuarios.Usuario",
        on_delete=models.CASCADE,
        related_name='turmas',
        null=True,
        blank=True,
        limit_choices_to={'cargo':'gestor'}
    )
    def __str__(self):
        return f"{self.nome} ({self.instituicao.get_tipo_display()})"

class Demanda(models.Model):
    titulo = models.CharField(max_length=100)
    descricao = models.TextField(blank=True)
    data = models.DateField(blank=True, default=date.today)
    entrega = models.DateField(blank=True, null=True)
    STATUS = [
        ('pendente', 'Pendente'),
        ('concluida', 'Concluída'),
    ]
    status = models.CharField(max_length=10, choices=STATUS, blank=True)
    turma = models.ForeignKey(
    Turma,
    on_delete=models.CASCADE,
    related_name='objetos_que_ele_gera',
    )
    def __str__(self):
        return f'{self.titulo}, {self.turma.gestor.nome}, {self.turma}'

class Dispositvo(models.Model):
    uuid=models.UUIDField(default=uuid.uuid4)
    instituicao = models.ForeignKey(
        Instituicao,
        on_delete=models.CASCADE,
        related_name='instituicao_disp',
        blank=True,
        null=True
    )
    def __str__(self):
        return f'Instituição: {self.instituicao.nome}'
    ultimo_ping = models.DateTimeField(null=True, blank=True)
    ultimo_registro = models.DateTimeField(null=True, blank=True)
    @property
    def online(self):
        if not self.ultimo_ping:
            return False
        delta = timezone.now() - self.ultimo_ping
        return delta.total_seconds() < 60 