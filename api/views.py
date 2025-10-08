from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from usuarios.models import Usuario, Registro
from instituicoes.models import Dispositvo, Turma, Instituicao
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from datetime import datetime, time, date, timedelta
from django.contrib.auth.decorators import login_required
from django.db.models import Q, F, Value, CharField, Case, When
import json
from django.views.decorators.csrf import csrf_exempt

def api(request):
    return JsonResponse({'RESPONSE':200})

@csrf_exempt
def registrar_frequencia(request):
    if request.method == "POST":
        try:
            body = json.loads(request.body)
            uuid = body.get("uuid")
            dispositivo = body.get('dispositivo_id')
        except json.JSONDecodeError:
            return JsonResponse({"error": "JSON inválido"}, status=400)
        estagiario = Usuario.objects.filter(uuid=uuid).first()
        dispositivo = Dispositvo.objects.filter(uuid=dispositivo).first()
        instituicao = dispositivo.instituicao
        if instituicao.tipo == 'escola':
            turma = estagiario.turma_escola
        elif instituicao.tipo == 'empresa':
            turma = estagiario.turma_empresa
        if not turma:
            return JsonResponse({"erro": "Estagiário não está alocado a uma turma nessa instituição"}, status=400)
        hoje = date.today()
        dia_semana = [
            'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'
        ][hoje.weekday()]  # retorna o nome do dia
        
        hora_entrada = turma.hora_entrada  
        hora_saida = turma.hora_saida

        tolerancia = timedelta(minutes=20)
        agora = time(18, 10, 00)

        # agora = datetime.now().time().replace(microsecond=0)
        entrada_dt = datetime.combine(hoje, hora_entrada)
        saida_dt = datetime.combine(hoje, hora_saida)
        agora_dt = datetime.combine(date.today(), agora)
        limite_entrada = entrada_dt + tolerancia
        limite_saida = saida_dt - tolerancia
        print(f' AGORA:{agora}, DATA ENTRADA:{entrada_dt} , SAIDA:{saida_dt}')
        if not estagiario or not dispositivo:
            return JsonResponse({"error": "Estagiário não encontrado"}, status=404)
        if dia_semana in turma.dias_semana:
            if agora_dt <= limite_entrada:
                status = "presente"
                justificado = True
            elif limite_entrada < agora_dt < limite_saida:
                status = "atrasado"
                justificado = False
            else:
                status = "falta"
                return JsonResponse({"mensagem": f"{status}"})
            Registro.objects.create(
                estagiario=estagiario,
                hora_registro=agora,
                status=status,
                instituicao=instituicao,
                justificado=justificado,
                turma = turma
            )
            dispositivo.ultimo_registro = timezone.now()
            dispositivo.save()
        else:
            status = "Hoje não é dia de aula"

        return JsonResponse({"mensagem": f"{status}"})
    
    return JsonResponse({"error": "Método não permitido"}, status=405)

@csrf_exempt
def ping_dispositivo(request):
    if request.method == "POST":
        try:
            body = json.loads(request.body)
            uuid = body.get("uuid")
        except json.JSONDecodeError:
            return JsonResponse({"error": "JSON inválido"}, status=400)
        dispositivo = Dispositvo.objects.get(uuid=uuid)
        dispositivo.ultimo_ping = timezone.now()
        dispositivo.save()
        return JsonResponse({'agora':timezone.now()})
    return JsonResponse({"error": "Método não permitido"}, status=405)

@login_required
def frequencia_gestor(request):
    usuario = request.user.usuario
    if usuario.cargo == 'estagiario':
        return redirect('inicio')
    
    elif usuario.cargo == 'gestor':
        estagiarios_qs = Usuario.objects.filter(
        Q(turma_empresa__gestor=usuario) | Q(turma_escola__gestor=usuario)
        ).annotate(
            turma_nome=Case(
                When(turma_empresa__gestor=usuario, then=F('turma_empresa__nome')),
                When(turma_escola__gestor=usuario, then=F('turma_escola__nome')),
                default=Value('Sem turma'),
                output_field=CharField()
            )
        )
        turmas_qs = Turma.objects.filter(gestor=usuario)

        registros = []
        turmas=[]
        estagiarios = []
        turmas_aluno = []

        for t in turmas_qs:
            turmas.append({
                'id':t.id,
                'nome':t.nome,
            })
        estagiarios = []
        registros_estagiario = []
        for e in estagiarios_qs:
            turmas_aluno = []

            if e.turma_empresa and e.turma_empresa.gestor == usuario:
                turmas_aluno.append(e.turma_empresa.id)

            if e.turma_escola and e.turma_escola.gestor == usuario:
                turmas_aluno.append(e.turma_escola.id)

            turmas_aluno = list(set(turmas_aluno))  # remove duplicatas

            # Buscar registros do estagiário nas turmas dele
            registros_estagiario = Registro.objects.filter(
                estagiario=e,
                turma_id__in=turmas_aluno
            ).values('id', 'turma_id', 'data', 'hora_registro', 'status')  # ou os campos que quiser

            estagiarios.append({
                'uuid':e.uuid,
                'nome': e.nome,
                'foto':e.image.url,
                'turmas_estagiario': turmas_aluno,
                'registros': list(registros_estagiario)
            })

        data = {
            'estagiarios':list(estagiarios),
            'turmas': list(turmas),
        }
    return JsonResponse(data)

@csrf_exempt
def demandas_gestor(request):
    return JsonResponse({'demandas':'demandas'})

def dispositivos(request):
    usuario = request.user.usuario

    # Filtra as instituições onde o gestor é o usuário atual
    instituicao_qs = Instituicao.objects.filter(instituicao__gestor=usuario)

    # Busca todos os dispositivos dessas instituições
    dispositivos_qs = Dispositvo.objects.filter(instituicao__in=instituicao_qs)
    dispositivos = [
    {
        "id": d.uuid,
        "instituicao": d.instituicao.nome,
        'status':d.online,
        'utlimo_ping':str(d.ultimo_ping),
        'utlimo_registro':str(d.ultimo_registro)
    }
    for d in dispositivos_qs
    ]
    return JsonResponse(dispositivos, safe=False)

# GERAR PDF
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from datetime import datetime
import io 
from reportlab.platypus import Image
import os
import json

def gerar_pdf(dados_json, gestor_nome=""):
    """
    Gera um relatório de frequência em PDF a partir de um dicionário de dados.
    O PDF é criado em memória e seus dados binários são retornados.
    """
    # Dados principais do JSON
    
    def formatar_data_brasileira(data_iso):
        return datetime.strptime(data_iso, "%Y-%m-%d").strftime("%d/%m/%Y")
    """Converte data do formato ISO (2025-10-06) para o formato brasileiro (06/10/2025)."""
    unico = dados_json.get("unico", False)
    data = dados_json.get("data")
    hora = dados_json.get("hora")
    turma = dados_json.get("turma")
    dados = dados_json.get("dados", [])

    # Cria um buffer na memória para receber os dados do PDF
    buffer = io.BytesIO()
    
    # Gera um nome de arquivo dinâmico
    nome_arquivo = f"Relatorio_{turma.replace(' ', '_')}_{'Individual' if unico else 'Geral'}.pdf"

    # Definindo margens
    leftMargin = rightMargin = 20
    topMargin = bottomMargin = 20

    # Configura o documento PDF para usar o buffer
    pdf = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=rightMargin, leftMargin=leftMargin,
                            topMargin=topMargin, bottomMargin=bottomMargin)
    estilos = getSampleStyleSheet()
    elementos = []

    # --- Construção do PDF ---
    
    # Imagem no topo
    caminho_imagem = "./media/pdf_bg.png"
    imagem = Image(caminho_imagem, width=150, height=60)
    imagem.hAlign = "CENTER"
    elementos.append(imagem)
    elementos.append(Spacer(1, 12))

    # Título do relatório
    titulo = Paragraph(
        "<b>Relatório Individual de Frequência</b>" if unico else "<b>Relatório Geral de Frequência</b>",
        estilos["Title"]
    )
    elementos.append(titulo)
    elementos.append(Spacer(1, 12))

    # 2. Cabeçalho de Informações
    if unico:
        nome_estagiario = dados_json.get("nome", "Não Identificado")
        info_texto = f"""
            <b>Turma:</b> {turma}<br/>
            <b>Estagiário:</b> {nome_estagiario}<br/>
            <b>Gestor:</b> {gestor_nome}<br/>
            <b>Data do Relatório:</b> {formatar_data_brasileira(data)} — <b>Hora:</b> {hora}
        """
    else:
        info_texto = f"""
            <b>Turma:</b> {turma}<br/>
            <b>Gestor:</b> {gestor_nome}<br/>
            <b>Data do Relatório:</b> {formatar_data_brasileira(data)} — <b>Hora:</b> {hora}
        """
    info = Paragraph(info_texto, estilos["Normal"])
    elementos.append(info)
    elementos.append(Spacer(1, 20))

    # 3. Tabela de Dados
    if not dados:
        elementos.append(Paragraph("Nenhum dado de frequência foi encontrado para este relatório.", estilos["Normal"]))
    else:
        if unico:
            tabela_dados = [["Data", "Status", "Hora"]]
            for grupo in dados:
                for reg in grupo:
                    status = reg.get("status", "-").capitalize()
                    hora_reg = reg.get("hora_registro") or "Sem registro."
                    hora_reg = (
                        reg.get("hora_registro") or "--"
                        if reg.get("hora_registro") or "--"
                        else "Sem último registro."
                    )
                    tabela_dados.append([formatar_data_brasileira(reg.get("data", "-")), status, hora_reg])
            tabela = Table(tabela_dados, colWidths=[120, 120, 120])
        else:
            tabela_dados = [["Estagiário", f"Status de Hoje ({formatar_data_brasileira(data)})", "Último Registro"]]
            for grupo in dados:
                for reg in grupo:
                    status = reg.get("status", "-").capitalize()
                    ultimo_reg = (
                        f'{formatar_data_brasileira(reg.get("data"))} - {reg.get("hora_registro")}'
                        if reg.get("data") and reg.get("hora_registro")
                        else f'{formatar_data_brasileira(reg.get("ultimo_registro_data"))} - {reg.get("ultimo_registro_hora")}'
                        if reg.get("ultimo_registro_data") and reg.get("ultimo_registro_hora")
                        else "Sem último registro."
                    )
                    tabela_dados.append([reg.get("nome", "-"), status, ultimo_reg])
            tabela = Table(tabela_dados, colWidths=[150, 120, 150])

        # Estilo da Tabela
        
        # CALCULAR LARGURA TOTAL
        largura_pagina, altura_pagina = A4
        largura_util = largura_pagina - leftMargin - rightMargin
        col_count = len(tabela_dados[0])
        colWidths = [largura_util / col_count] * col_count

        tabela = Table(tabela_dados, colWidths=colWidths)

        # Estilo da tabela
        tabela.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#026E6B")),  # Cabeçalho
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),

            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor("#212529")),
            ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor("#f8f9fa")]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        elementos.append(tabela)

    elementos.append(Spacer(1, 20))

    # 4. Rodapé
    rodape = Paragraph(
        f"<font size=8 color=grey>Gerado automaticamente em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</font>",
        estilos["Normal"]
    )
    elementos.append(rodape)

    # Gera o PDF no buffer
    pdf.build(elementos)

    # Retorna o cursor do buffer para o início
    buffer.seek(0)
    
    # Retorna os dados do PDF e o nome do arquivo
    return buffer, nome_arquivo

@login_required
def exportar_pdf(request):
    if request.method == "POST":
        try:
            # Pega o corpo da requisição e transforma em dicionário Python
            dados_json = json.loads(request.body)
            
            # Pega o nome do usuário logado para usar como "Gestor"
            # (Requer que o usuário esteja autenticado)
            gestor_nome = ""
            if request.user.is_authenticated:
                gestor_nome = request.user.usuario.nome

            # Chama a função para gerar o PDF em memória
            pdf_buffer, nome_arquivo = gerar_pdf(dados_json, gestor_nome)

            # Cria a resposta HTTP com o conteúdo do PDF
            response = HttpResponse(pdf_buffer, content_type='application/pdf')
            
            # Define o cabeçalho para forçar o download com o nome de arquivo correto
            response['Content-Disposition'] = f'attachment; filename="{nome_arquivo}"'
            
            return response

        except json.JSONDecodeError:
            return JsonResponse({"error": "Corpo da requisição contém JSON inválido."}, status=400)
        except Exception as e:
            # Captura outros possíveis erros durante a geração do PDF
            return JsonResponse({"error": f"Ocorreu um erro ao gerar o PDF: {str(e)}"}, status=500)
            
    # Se o método não for POST, retorna um erro
    return JsonResponse({"error": "Método não permitido. Utilize POST."}, status=405)