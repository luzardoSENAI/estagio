
from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.models import User
from usuarios.models import Usuario, Registro
from instituicoes.models import Dispositvo, Turma, Instituicao
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from datetime import datetime, time, date, timedelta
from django.contrib.auth.decorators import login_required
from django.db.models import Q, F, Value, CharField, Case, When
import json
from django.views.decorators.csrf import csrf_exempt
import locale

def api(request):
    return JsonResponse({'RESPONSE':200})

@csrf_exempt
def registrar_frequencia(request):
    if request.method == "POST":
        try:
            body = json.loads(request.body)
            d_uuid = body.get('dispositivo_id')
            registros = body.get('registros')
        except json.JSONDecodeError:
            return JsonResponse({"error": "JSON inválido"}, status=400)
        
        dispositivo = Dispositvo.objects.get(uuid = d_uuid)
        
        instituicao = dispositivo.instituicao

        response = []

        if registros.__len__() == 0:
            return JsonResponse({'status':'Sem registros para enviar'}, safe=False)

        for r in registros:
            estagiario = Usuario.objects.get(uuid=r['uuid'])
            if instituicao.tipo == 'escola':
                turma = estagiario.turma_escola
            elif instituicao.tipo == 'empresa':
                turma = estagiario.turma_empresa
            if not turma:
                response.append({
                    'aluno':r['uuid'],
                    'status':'Não pertence a turma'
                })
                continue

            hoje = datetime.strptime(r['data'], '%Y-%m-%d').date()

            dia_semana = [
                'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'
            ][hoje.weekday()]  # retorna o nome do dia
            
            hora_entrada = turma.hora_entrada  
            hora_saida = turma.hora_saida

            tolerancia = timedelta(minutes=20)
            
            # agora = time(18, 10, 00)
            agora = datetime.strptime(r['hora'], '%H:%M:%S').time()

            entrada_dt = datetime.combine(hoje, hora_entrada)
            saida_dt = datetime.combine(hoje, hora_saida)
            data_dt = datetime.strptime(r['data'], '%Y-%m-%d').date()
            agora_dt = datetime.combine(data_dt, agora)
            limite_entrada = entrada_dt + tolerancia
            limite_saida = saida_dt - tolerancia
            print(f' AGORA:{agora}, DATA ENTRADA:{entrada_dt} , SAIDA:{saida_dt}')
            if not estagiario:
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
                    data=data_dt,
                    instituicao=instituicao,
                    justificado=justificado,
                    turma = turma
                )
                dispositivo.ultimo_registro = timezone.now()
                dispositivo.save()
            else:
                status = "Hoje não é dia de aula"
            response.append({
                'aluno':r['uuid'],
                'status':status,
                'hora':r['hora'],
                'data':r['data']
            })
        return(JsonResponse(response, safe=False))
    
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
        # GET =================================
        if request.method=='GET':
            
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

                estagiarios.append({
                    'nome': e.nome,
                    'email':e.email,
                    'cpf':e.cpf,
                    'usuario':e.user.username,
                    'telefone':e.telefone,
                    'uuid':e.uuid,
                    'matricula':e.matricula,
                    'foto':e.image.url,
                    'turmas_estagiario': turmas_aluno,
                })

            data = {
                'estagiarios':list(estagiarios),
                'turmas': list(turmas),
            }
            return JsonResponse(data)

        elif request.method == 'POST':
            hoje = date.today()
            try:
                body = json.loads(request.body)
                estagiario_uuid = body.get('estagiario')
                turma_id = body.get('turma')
                status_filtro = body.get('status', 'all')
                dias_filtro = body.get('dias', 'all')

                if not turma_id:
                    return JsonResponse({"error": "O ID da turma é obrigatório."}, status=400)

                dias_semana_map = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']

                # --- CASO 1: RESUMO DE TODOS OS ESTAGIÁRIOS DA TURMA ---
                if estagiario_uuid == 'all':
                    try:
                        turma = Turma.objects.get(id=turma_id)
                        dia_semana_hoje = dias_semana_map[hoje.weekday()]
                        
                        # Retorna vazio se não for um dia de aula programado para a turma

                        # Busca usuários que são estagiários E que pertencem à turma
                        # seja no campo turma_escola OU no campo turma_empresa.
                        estagiarios_da_turma = Usuario.objects.filter(
                            Q(turma_escola_id=turma_id) | Q(turma_empresa_id=turma_id),
                            cargo='estagiario'
                        )

                        resultados = []
                        for estagiario in estagiarios_da_turma:
                            # Pega o último registro do estagiário NAQUELA TURMA no dia de HOJE
                            ultimo_registro_hoje = Registro.objects.filter(
                                estagiario=estagiario,
                                turma_id=turma_id,
                                data=hoje
                            ).order_by('-hora_registro').first()

                            status_hoje = "falta"
                            hora_registro_hoje = None
                            ultimo_registro_data = None
                            ultimo_registro_hora = None

                            if ultimo_registro_hoje:
                                status_hoje = ultimo_registro_hoje.status
                                hora_registro_hoje = ultimo_registro_hoje.hora_registro.strftime('%H:%M:%S')
                            else:
                                # Se faltou hoje, busca o último registro geral na turma
                                ultimo_registro_geral = Registro.objects.filter(
                                    estagiario=estagiario,
                                    turma_id=turma_id
                                ).order_by('-data', '-hora_registro').first()

                                if ultimo_registro_geral:
                                    ultimo_registro_data = ultimo_registro_geral.data.strftime('%Y-%m-%d')
                                    ultimo_registro_hora = ultimo_registro_geral.hora_registro.strftime('%H:%M:%S')
                            
                            # Aplica o filtro de status
                            if status_filtro == 'all' or status_hoje.lower() == status_filtro.lower():
                                resultados.append({
                                    'uuid': estagiario.uuid,
                                    'foto': estagiario.foto_perfil, # Usando a property
                                    'nome': estagiario.nome,
                                    'data': hoje.strftime('%Y-%m-%d'),
                                    'status': status_hoje,
                                    'hora_registro': hora_registro_hoje,
                                    'ultimo_registro_data': ultimo_registro_data,
                                    'ultimo_registro_hora': ultimo_registro_hora,
                                })

                        return JsonResponse({'dados': resultados}, safe=False)

                    except Turma.DoesNotExist:
                        return JsonResponse({"error": "Turma não encontrada"}, status=404)

                # --- CASO 2: HISTÓRICO DE UM ESTAGIÁRIO ESPECÍFICO ---
                else:
                    try:
                        estagiario = Usuario.objects.get(uuid=estagiario_uuid, cargo='estagiario')
                        turma = Turma.objects.get(id=turma_id)

                        # Validação extra: verifica se o estagiário realmente pertence a essa turma
                        if estagiario.turma_escola_id != int(turma_id) and estagiario.turma_empresa_id != int(turma_id):
                            return JsonResponse({"error": "O estagiário não pertence à turma especificada."}, status=403)

                        # --- LÓGICA AJUSTADA ---
                        # Define o número de DIAS DE AULA a serem buscados
                        quantidade_dias_de_aula = 15 if dias_filtro == 'all' else int(dias_filtro)
                        
                        # Se a turma não tiver dias de aula definidos, retorna uma lista vazia para evitar loops.
                        if not turma.dias_semana:
                            return JsonResponse({'dados': []}, safe=False)

                        datas_para_verificar = []
                        dias_calendario_verificados = 0
                        data_atual = hoje

                        # Loop continua buscando para trás no calendário até encontrar a quantidade
                        # desejada de dias de aula.
                        # Adicionado um limite de 365 dias corridos para evitar loops infinitos.
                        while len(datas_para_verificar) < quantidade_dias_de_aula and dias_calendario_verificados < 365:
                            dia_da_semana = dias_semana_map[data_atual.weekday()]
                            
                            # Se o dia da semana atual for um dia de aula programado, adiciona à lista.
                            if dia_da_semana in turma.dias_semana:
                                datas_para_verificar.append(data_atual)
                            
                            # Prepara para verificar o dia anterior na próxima iteração.
                            data_atual -= timedelta(days=1)
                            dias_calendario_verificados += 1
                        
                        # --- FIM DA LÓGICA AJUSTADA ---

                        resultados = []
                        # O restante do código permanece o mesmo, iterando sobre as datas de aula que foram coletadas.
                        for data_verificar in datas_para_verificar:
                            registro_do_dia = Registro.objects.filter(
                                estagiario=estagiario,
                                turma_id=turma_id,
                                data=data_verificar
                            ).order_by('-hora_registro').first()

                            status_dia = "falta" if not registro_do_dia else registro_do_dia.status
                            hora_registro_dia = None if not registro_do_dia else registro_do_dia.hora_registro.strftime('%H:%M:%S')
                            try:
                                # Para Linux, macOS e a maioria dos ambientes de produção
                                    locale.setlocale(locale.LC_TIME, 'pt_BR.UTF-8')
                            except locale.Error:
                                try:
                                    # Para Windows
                                    locale.setlocale(locale.LC_TIME, 'Portuguese_Brazil.1252')
                                except locale.Error:
                                        # Fallback para o locale padrão do sistema se nenhum funcionar
                                    locale.setlocale(locale.LC_TIME, '')

                            # Aplica o filtro de status
                            if status_filtro == 'all' or status_dia.lower() == status_filtro.lower():
                                dias_semana_map = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']
                                dia_da_semana = dias_semana_map[data_verificar.weekday()]
                                resultados.append({
                                    'uuid': estagiario.uuid,
                                    'foto': estagiario.foto_perfil,
                                    'nome': estagiario.nome,
                                    'data': data_verificar.strftime('%Y-%m-%d'),
                                    'status': status_dia,
                                    'hora_registro': hora_registro_dia,
                                    'ultimo_registro_data': None,
                                    'ultimo_registro_hora': None,
                                    'dia':dia_da_semana.capitalize()
                                })
                        
                        # A lista `resultados` está em ordem decrescente (hoje -> passado).
                        # Invertemos para que fique em ordem cronológica para o frontend.
                        return JsonResponse({
                            'dados': resultados
                            }, safe=False, json_dumps_params={'ensure_ascii': False})

                    except Usuario.DoesNotExist:
                        return JsonResponse({"error": "Estagiário não encontrado"}, status=404)
                    except Turma.DoesNotExist:
                        return JsonResponse({"error": "Turma não encontrada"}, status=404)
                    except Exception as e:
                        return JsonResponse({"error": f"Ocorreu um erro interno: {str(e)}"}, status=500)

                    except Usuario.DoesNotExist:
                        return JsonResponse({"error": "Estagiário não encontrado"}, status=404)
                    except Turma.DoesNotExist:
                        return JsonResponse({"error": "Turma não encontrada"}, status=404)

            except json.JSONDecodeError:
                return JsonResponse({"error": "JSON inválido"}, status=400)
            except Exception as e:
                return JsonResponse({"error": f"Ocorreu um erro interno: {str(e)}"}, status=500)

    return JsonResponse({'teste':'teste'})

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

def gerar_pdf(contexto):
    """
    Gera um relatório de frequência em PDF a partir de um dicionário de contexto.
    O PDF é criado em memória e seus dados binários são retornados.
    """
    # --- Funções Auxiliares ---
    def formatar_data_brasileira(data_iso):
        if not data_iso: return "--"
        try: return datetime.strptime(data_iso, "%Y-%m-%d").strftime("%d/%m/%Y")
        except (ValueError, TypeError): return data_iso

    # --- Extração de Dados do Contexto ---
    tipo_relatorio = contexto.get("tipo_relatorio", "geral")
    turma_nome = contexto.get("turma_nome", "N/A")
    gestor_nome = contexto.get("gestor_nome", "N/A")
    data_emissao = contexto.get("data_emissao")
    hora_emissao = contexto.get("hora_emissao")
    dados = contexto.get("dados", [])

    # --- Configuração do Documento ---
    buffer = io.BytesIO()
    nome_arquivo = f"Relatorio_{turma_nome.replace(' ', '_')}_{tipo_relatorio.capitalize()}.pdf"
    
    pdf = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=inch/2, leftMargin=inch/2, topMargin=inch/2, bottomMargin=inch/2)
    estilos = getSampleStyleSheet()
    elementos = []

    # --- 1. Título e Informações ---
    is_individual = tipo_relatorio == "individual"
    titulo_texto = "Relatório Individual de Frequência" if is_individual else "Relatório Geral de Frequência"
    elementos.append(Paragraph(titulo_texto, estilos["Title"]))
    elementos.append(Spacer(1, 12))

    info_texto = f"<b>Turma:</b> {turma_nome}<br/>"
    if is_individual:
        nome_estagiario = contexto.get("nome_estagiario", "Não Identificado")
        info_texto += f"<b>Estagiário:</b> {nome_estagiario}<br/>"
    info_texto += f"<b>Gestor Responsável:</b> {gestor_nome}<br/><b>Data de Emissão:</b> {formatar_data_brasileira(data_emissao)} às {hora_emissao}"
    elementos.append(Paragraph(info_texto, estilos["Normal"]))
    elementos.append(Spacer(1, 20))

    # --- 2. Tabela de Dados ---
    if not dados:
        elementos.append(Paragraph("Nenhum dado encontrado para os filtros selecionados.", estilos["Normal"]))
    else:
        if is_individual:
            tabela_dados = [["Data da Aula", "Status", "Hora do Registro"]]
            for reg in dados:
                tabela_dados.append([
                    formatar_data_brasileira(reg.get("data")),
                    reg.get("status", "-").capitalize(),
                    reg.get("hora_registro") or "--"
                ])
            colWidths = [150, 150, 150]
        else: # Relatório Geral
            data_formatada = formatar_data_brasileira(data_emissao)
            tabela_dados = [["Estagiário", f"Status em {data_formatada}", "Observação"]]
            for reg in dados:
                observacao = ""
                if reg.get("status") in ['presente', 'atrasado']:
                    observacao = f'Registrado hoje às {reg.get("hora_registro")}'
                elif reg.get("ultimo_registro_data"):
                    ultimo_data = formatar_data_brasileira(reg.get("ultimo_registro_data"))
                    observacao = f'Último registro em {ultimo_data} às {reg.get("ultimo_registro_hora")}'
                else:
                    observacao = "Nenhum registro anterior encontrado"
                
                tabela_dados.append([
                    reg.get("nome", "-"),
                    reg.get("status", "-").capitalize(),
                    observacao
                ])
            colWidths = [200, 120, 220]

        tabela = Table(tabela_dados, colWidths=colWidths)
        tabela.setStyle(TableStyle([
           ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#026E6B")),
           ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
           ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
           ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
           ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
           ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
           ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F0F0F0")]),
           ('GRID', (0, 0), (-1, -1), 1, colors.darkgrey),
        ]))
        elementos.append(tabela)

    # --- Geração do PDF ---
    pdf.build(elementos)
    buffer.seek(0)
    
    return buffer, nome_arquivo

@csrf_exempt # Use apenas para teste. Em produção, use a autenticação correta.
def exportar_pdf(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Método não permitido"}, status=405)

    try:
        req_json = json.loads(request.body)
        tipo_relatorio = req_json.get("tipo_relatorio")
        turma_id = req_json.get("turma_id")
        
        # O gestor é identificado pela sessão, não enviado pelo frontend
        gestor = request.user.usuario 

        # --- Busca os dados com base no tipo de relatório ---
        # (Esta é a mesma lógica das respostas anteriores)
        
        dados_para_pdf, turma_obj = buscar_dados_para_relatorio(req_json)

        # --- Monta o contexto para a função de PDF ---
        contexto_para_pdf = {
            "tipo_relatorio": tipo_relatorio,
            "turma_nome": turma_obj.nome,
            "gestor_nome": gestor.nome,
            "data_emissao": date.today().strftime("%Y-%m-%d"),
            "hora_emissao": datetime.now().strftime("%H:%M:%S"),
            "dados": dados_para_pdf
        }

        # Se for individual, adiciona o nome do estagiário ao contexto
        if tipo_relatorio == 'individual':
            # Supondo que o nome está no primeiro registro dos dados
            if dados_para_pdf:
                contexto_para_pdf["nome_estagiario"] = dados_para_pdf[0].get('nome')

        # --- Chama a função para gerar o PDF ---
        buffer, nome_arquivo = gerar_pdf(contexto_para_pdf)

        # --- Retorna o PDF como uma resposta HTTP ---
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{nome_arquivo}"'
        return response

    except (json.JSONDecodeError, KeyError) as e:
        return JsonResponse({"error": f"JSON inválido ou chave ausente: {e}"}, status=400)
    except Exception as e:
        # Capture outras exceções (ex: Turma.DoesNotExist)
        return JsonResponse({"error": f"Ocorreu um erro: {e}"}, status=500)

# Você pode mover a lógica de busca para uma função separada para organização
def buscar_dados_para_relatorio(req_json):
    tipo = req_json.get('tipo_relatorio')
    turma_id = req_json.get('turma_id')
    status_filtro = req_json.get('status_filtro', 'all')
    
    if not turma_id:
        raise ValueError("O ID da turma é obrigatório.")

    # Busca a turma. Se não encontrar, a exceção será capturada pela view principal.
    turma = Turma.objects.get(id=turma_id)
    
    hoje = date.today()
    dias_semana_map = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']
    resultados = []

    # --- LÓGICA PARA RELATÓRIO GERAL ---
    if tipo == 'all':
        dia_semana_hoje = dias_semana_map[hoje.weekday()]

        # Se hoje não for um dia de aula programado, não há nada a fazer.
        if dia_semana_hoje not in (turma.dias_semana or []):
            return [], turma
        
        # Busca todos os estagiários da turma
        estagiarios_da_turma = Usuario.objects.filter(
            Q(turma_escola_id=turma_id) | Q(turma_empresa_id=turma_id),
            cargo='estagiario'
        )

        for estagiario in estagiarios_da_turma:
            # Pega o último registro do estagiário NAQUELA TURMA no dia de HOJE
            ultimo_registro_hoje = Registro.objects.filter(
                estagiario=estagiario,
                turma=turma,
                data=hoje
            ).order_by('-hora_registro').first()

            status_hoje = "falta"
            hora_registro_hoje = None
            ultimo_registro_data = None
            ultimo_registro_hora = None

            if ultimo_registro_hoje:
                status_hoje = ultimo_registro_hoje.status
                hora_registro_hoje = ultimo_registro_hoje.hora_registro.strftime('%H:%M:%S')
            else:
                # Se faltou hoje, busca o último registro geral na turma
                ultimo_registro_geral = Registro.objects.filter(
                    estagiario=estagiario,
                    turma=turma
                ).order_by('-data', '-hora_registro').first()

                if ultimo_registro_geral:
                    ultimo_registro_data = ultimo_registro_geral.data.strftime('%Y-%m-%d')
                    ultimo_registro_hora = ultimo_registro_geral.hora_registro.strftime('%H:%M:%S')
            
            # Adiciona ao resultado apenas se passar pelo filtro de status
            if status_filtro == 'all' or status_hoje.lower() == status_filtro.lower():
                resultados.append({
                    'nome': estagiario.nome,
                    'status': status_hoje,
                    'hora_registro': hora_registro_hoje,
                    'ultimo_registro_data': ultimo_registro_data,
                    'ultimo_registro_hora': ultimo_registro_hora
                })
        
        return resultados, turma

    # --- LÓGICA PARA RELATÓRIO INDIVIDUAL ---
    elif tipo == 'individual':
        estagiario_uuid = req_json.get('estagiario_uuid')
        dias_filtro = req_json.get('dias_filtro', 'all')
        
        if not estagiario_uuid:
            raise ValueError("O UUID do estagiário é obrigatório para relatórios individuais.")

        estagiario = Usuario.objects.get(uuid=estagiario_uuid, cargo='estagiario')

        # Validação extra para garantir que o estagiário pertence à turma
        if estagiario.turma_escola_id != int(turma_id) and estagiario.turma_empresa_id != int(turma_id):
            raise PermissionError("O estagiário solicitado não pertence à turma especificada.")

        # Define o número de DIAS DE AULA a serem buscados
        try:
            quantidade_dias_de_aula = 15 if dias_filtro == 'all' else int(dias_filtro)
        except (ValueError, TypeError):
            quantidade_dias_de_aula = 15 # Padrão seguro

        datas_para_verificar = []
        if turma.dias_semana: # Procede apenas se a turma tiver dias de aula definidos
            dias_calendario_verificados = 0
            data_atual = hoje
            # Loop continua buscando para trás até encontrar a quantidade desejada de dias de aula
            while len(datas_para_verificar) < quantidade_dias_de_aula and dias_calendario_verificados < 365:
                if dias_semana_map[data_atual.weekday()] in turma.dias_semana:
                    datas_para_verificar.append(data_atual)
                data_atual -= timedelta(days=1)
                dias_calendario_verificados += 1
        
        for data_verificar in datas_para_verificar:
            registro_do_dia = Registro.objects.filter(
                estagiario=estagiario,
                turma=turma,
                data=data_verificar
            ).order_by('-hora_registro').first()

            status_dia = "falta" if not registro_do_dia else registro_do_dia.status
            
            # Adiciona ao resultado apenas se passar pelo filtro de status
            if status_filtro == 'all' or status_dia.lower() == status_filtro.lower():
                resultados.append({
                    'nome': estagiario.nome, # Adicionado para consistência
                    'data': data_verificar.strftime('%Y-%m-%d'),
                    'status': status_dia,
                    'hora_registro': registro_do_dia.hora_registro.strftime('%H:%M:%S') if registro_do_dia else None,
                })
        
        # Inverte a lista para que as datas fiquem em ordem cronológica (passado -> presente)
        resultados.reverse()
        return resultados, turma

    # Retorno padrão caso o tipo de relatório não seja reconhecido
    return [], turma

def get_cpf(request,cpf,turma):
    usuario = Usuario.objects.get(user=request.user)

    if usuario.cargo != 'gestor':
        return JsonResponse({'status':'Acesso negado'})
    
    estagiario = Usuario.objects.filter(cpf=cpf).first()
    turma = Turma.objects.filter(id=turma).first()
    if estagiario and turma:
        if (estagiario.turma_empresa and estagiario.turma_empresa == turma) or \
            (estagiario.turma_escola and estagiario.turma_escola == turma):
            return JsonResponse({
            'nome':estagiario.nome,
            'status':'Estagiário já está na turma',
            })
        else:
            return JsonResponse({
                'nome':estagiario.nome,
                'status':True
                })
    else:
        return JsonResponse(
            {
                'nome':'Não encontrado',
                'status':False
            })
    
def atribuir_estagiario(request):
    if request.method == 'POST':
        body = json.loads(request.body)
        cpf = body.get('cpf')
        turma_id = body.get('turma_id')
        turma = Turma.objects.get(id=turma_id)
        estagiario = Usuario.objects.get(cpf=cpf)
        instituicao_tipo = turma.instituicao.tipo
        if instituicao_tipo == 'empresa':
            estagiario.turma_empresa = turma
        elif instituicao_tipo == 'escola':
            estagiario.turma_escola = turma
        estagiario.save()
    return JsonResponse({'status':'ok'})

@csrf_exempt
def cadastrar_estagiario(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'erro', 'mensagem': 'Método não permitido'}, status=405)
    
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'erro', 'mensagem': 'JSON inválido'}, status=400)
    
    # Campos obrigatórios
    password = data.get('senha')
    cpf = data.get('cpf')

    if not password or not cpf:
        return JsonResponse({'status': 'erro', 'mensagem': 'Campos obrigatórios faltando'}, status=400)
    
    # Verifica se CPF ou username já existem
    if Usuario.objects.filter(cpf=cpf).exists():
        return JsonResponse({'status': 'erro', 'mensagem': 'Usuário ou CPF já cadastrado'}, status=400)
    
    nome = data.get('nome')
    username_base = nome.lower().replace(' ', '')  # remove espaços e coloca em minúsculo
    username = username_base
    contador = 1

    # verifica se já existe no banco    
    while User.objects.filter(username=username).exists():
        username = f"{username_base}{contador}"
        contador += 1

    # Cria o User
    user = User.objects.create_user(username=username, password=password)

    turma_id = data.get('turma_id')
    turma = Turma.objects.get(id=turma_id)
    turma_tipo = turma.instituicao.tipo

    # Cria o Usuario vinculado ao User
    usuario = Usuario.objects.create(
        user=user,
        nome=data.get('nome'),
        cpf=cpf,
        email=data.get('email'),
        data_nascimento=data.get('nascimento'),
        telefone=data.get('telefone'),
        endereco=data.get('endereco'),
        cargo=data.get('cargo', 'estagiario'),
        turma_empresa=turma if turma_tipo == 'empresa' else None,
        turma_escola=turma if turma_tipo == 'escola' else None,
    )

    # Gera matrícula automática
    ano_atual = datetime.now().year
    id_formatado = f"{usuario.id:05d}"
    usuario.matricula = f"{ano_atual}{id_formatado}"
    usuario.save()
    
    return JsonResponse({'status': 'sucesso', 'mensagem': 'Usuário cadastrado com sucesso', 'usuario_id': usuario.id})