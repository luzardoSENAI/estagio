from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('',views.api),
    path('frequencia/registrar/',views.registrar_frequencia,name='registrar_frequencia'),

    # GESTOR
    path('frequencia_gestor/',views.frequencia_gestor,name='frequencia_gestor'),
    path('exportar_pdf/',views.exportar_pdf,name='exportar_pdf'),
    path('demandas_gestor',views.demandas_gestor,name='demandas_gestor')
]