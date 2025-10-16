from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render, redirect
from .forms import LoginForm
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.models import User
from usuarios.models import Usuario
from django.contrib.auth.forms import UserCreationForm
from django.db.models import Q

def login_view(request):
    if request.method == "POST":
        login_form = LoginForm(request, data=request.POST)
        if login_form.is_valid():
            user = login_form.get_user()
            login(request, user)
            return redirect('inicio')
    else:
        login_form = LoginForm()
    return render(request, 'login.html', {'login_form': login_form})

def error_404(request):
    return render(request,'404.html')

def logout_view(request):
    logout(request)
    return redirect('login')

@login_required
def inicio(request):
    return render(request,'inicio.html')

@login_required
def perfil(request):
    return render(request,'perfil.html')

@login_required
def frequencia(request):
    cargo = request.user.usuario.cargo
    if cargo == 'gestor':
        template = 'frequencia_gestor.html'
    elif cargo == 'estagiario':
        template = 'frequencia_estagiario.html'
    return render(request,template)

@login_required
def demandas(request):
    cargo = request.user.usuario.cargo
    if cargo == 'gestor':
        template = 'demandas_gestor.html'
    elif cargo == 'estagiario':
        template = 'demandas_estagiario.html'
    return render(request,template)

@login_required
def avaliacoes(request):
    cargo = request.user.usuario.cargo
    if cargo == 'gestor':
        template = 'avaliacoes_gestor.html'
    elif cargo == 'estagiario':
        template = 'avaliacoes_estagiario.html'
    return render(request,template)

@login_required
def dispositivo(request):
    cargo = request.user.usuario.cargo
    if cargo == 'gestor':
        template = 'dispositivo.html'
    elif cargo == 'estagiario':
        return redirect('error_404')
    return render(request,template)

@login_required
def cadastrar_estagiario(request):
    cargo = request.user.usuario.cargo
    if cargo == 'gestor':
        template = 'cadastrar_estagiario.html'
    elif cargo == 'estagiario':
        return redirect('error_404')
    return render(request,template)

@login_required
def gerenciar(request):
    cargo = request.user.usuario.cargo
    if cargo == 'gestor':
        template = 'gerenciar.html'
    elif cargo == 'estagiario':
        return redirect('error_404')
    return render(request,template)

def home(request):
    return render(request, 'home.html')