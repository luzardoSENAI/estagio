from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('',views.inicio,name='inicio'),

    path('frequencia/',views.frequencia,name='frequencia'),
    path('demandas/',views.demandas,name='demandas'),
    path('avaliacoes/',views.avaliacoes,name='avaliacoes'),
    path('dispositivo/',views.dispositivo,name='dispositivo'),
    path('cadastrar_estagiario/',views.cadastrar_estagiario,name='cadastrar_estagiario'),
    path('gerenciar/',views.gerenciar,name='gerenciar'),

    path('login/',views.login_view, name='login'),
    path('logout/',views.logout_view,name='logout'),
    path('perfil/',views.perfil,name='perfil'),
    path('404/',views.error_404,name='error_404'),
]
