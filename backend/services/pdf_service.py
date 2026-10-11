# ============================================================
# SERVICIO DE GENERACIÓN DE DOCUMENTOS PDF (pdf_service.py)
# Hotel & Resort Margarita Village - Talento Humano
#
# Genera documentos ejecutivos en formato PDF:
#   1. Ficha Técnica del Candidato (Expediente del Postulante)
#   2. Informe Ejecutivo de Gestión y KPIs de Selección
#
# Diseño limpio, tipografía corporativa y estructura visual sin solapamientos.
# ============================================================

import os
from io import BytesIO
from fpdf import FPDF
from datetime import datetime

# Ruta al logotipo institucional
ASSETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets"))
LOGO_PATH = os.path.join(ASSETS_DIR, "logo.png")
if not os.path.exists(LOGO_PATH):
    ALT_LOGO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "Margarita-Village-logo.png"))
    if os.path.exists(ALT_LOGO):
        LOGO_PATH = ALT_LOGO


def clean_str(val):
    """
    Sanitiza y normaliza cadenas de texto para compatibilidad con FPDF (latin-1).
    Reemplaza caracteres especiales problemáticos preservando acentos y eñes.
    """
    if val is None:
        return "—"
    if isinstance(val, bool):
        return "Sí" if val else "No"
    s = str(val).strip()
    if not s or s.lower() == "none" or s.lower() == "null":
        return "—"
    
    replacements = {
        '—': '-',
        '–': '-',
        '“': '"',
        '”': '"',
        '‘': "'",
        '’': "'",
        '•': '*',
        '…': '...',
        '°': 'o.',
        '¿': '?',
        '¡': '!',
        'SIGCS': 'Talento Humano',
        'SICS': 'Talento Humano',
    }
    for k, v in replacements.items():
        s = s.replace(k, v)
        
    try:
        return s.encode('latin-1', 'replace').decode('latin-1')
    except Exception:
        return s.encode('ascii', 'replace').decode('ascii')


class BaseCorporativoPDF(FPDF):
    """Clase base corporativa con pie de página institucional"""
    def __init__(self, titulo_doc="Documento Oficial"):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.set_margins(12, 12, 12)
        self.set_auto_page_break(auto=True, margin=15)
        self.titulo_doc = titulo_doc
        
    def footer(self):
        self.set_y(-12)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(120, 120, 120)
        fecha_gen = datetime.now().strftime('%d/%m/%Y %H:%M')
        self.cell(0, 8, clean_str(f"Hotel & Resort Margarita Village | {self.titulo_doc} | Emitido: {fecha_gen} | Pág. {self.page_no()}"), 0, 0, 'C')


def dibujar_encabezado_institucional(pdf, subtitulo_doc):
    """
    Dibuja el encabezado corporativo con el logotipo a la izquierda
    y el bloque de texto a la derecha, garantizando que el cursor Y quede
    por debajo del logo sin solapamientos.
    """
    pdf.add_page()
    pdf.set_xy(12, 12)
    y_start = 12
    
    # Renderizado del Logo (si existe)
    logo_w = 32
    logo_h = 16
    has_logo = os.path.exists(LOGO_PATH)
    
    if has_logo:
        try:
            pdf.image(LOGO_PATH, x=12, y=y_start, w=logo_w)
        except Exception:
            has_logo = False
            
    text_x = 48 if has_logo else 12
    text_w = 186 - (36 if has_logo else 0)
    
    # Texto institucional
    pdf.set_xy(text_x, y_start)
    pdf.set_font('Arial', 'B', 13)
    pdf.set_text_color(26, 54, 93) # Navy Blue
    pdf.cell(text_w, 6, clean_str("HOTEL & RESORT MARGARITA VILLAGE"), ln=1)
    
    pdf.set_x(text_x)
    pdf.set_font('Arial', 'B', 9.5)
    pdf.set_text_color(14, 116, 144) # Teal Corporativo
    pdf.cell(text_w, 5, clean_str("DEPARTAMENTO DE TALENTO HUMANO"), ln=1)
    
    pdf.set_x(text_x)
    pdf.set_font('Arial', '', 8)
    pdf.set_text_color(100, 116, 139) # Slate Muted
    pdf.cell(text_w, 4, clean_str("Av. Bolívar, Urb. Doral Margarita, Porlamar, Isla de Margarita, Nva. Esparta"), ln=1)
    
    pdf.set_x(text_x)
    pdf.set_font('Arial', 'I', 8)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(text_w, 4, clean_str(subtitulo_doc), ln=1)
    
    # Asegurar que el cursor Y esté siempre por debajo del logo y del texto
    y_despues = max(pdf.get_y(), y_start + logo_h) + 4
    pdf.set_xy(12, y_despues)


def generar_ficha_candidato_pdf(perfil, evaluacion=None, examen=None):
    """
    Genera la Ficha Técnica del Candidato (Expediente Oficial de Selección).
    Sin solicitudes de firma ni textos de solicitud de empleo.
    """
    pdf = BaseCorporativoPDF(titulo_doc="Ficha Técnica del Candidato")
    dibujar_encabezado_institucional(pdf, "Expediente del Postulante y Registro de Selección")
    
    W = 186 # Ancho utilizable (210 - 24)
    
    # ── BANNER PRINCIPAL DEL DOCUMENTO ──
    pdf.set_fill_color(30, 58, 138) # Azul Marino
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Arial', 'B', 10.5)
    pdf.cell(W, 7, clean_str("  FICHA TÉCNICA DEL CANDIDATO"), 0, 1, 'L', fill=True)
    
    # Barra de metadatos del expediente
    pdf.set_fill_color(241, 245, 249)
    pdf.set_text_color(51, 65, 85)
    pdf.set_font('Arial', '', 8)
    
    estado_cand = clean_str(perfil.get("estado") or perfil.get("estado_actual") or "Postulado")
    fecha_sol = perfil.get("fecha_solicitud")
    fecha_str = clean_str(str(fecha_sol)) if fecha_sol else datetime.now().strftime('%d/%m/%Y')
    cedula_str = clean_str(perfil.get("cedula"))
    
    pdf.cell(62, 5.5, clean_str(f"  Cédula: V-{cedula_str}"), 1, 0, 'L', fill=True)
    pdf.cell(62, 5.5, clean_str(f"  Estado del Proceso: {estado_cand}"), 1, 0, 'L', fill=True)
    pdf.cell(62, 5.5, clean_str(f"  Fecha de Registro: {fecha_str}"), 1, 1, 'L', fill=True)
    
    pdf.ln(3)
    
    # Funciones de apoyo para celdas perfectamente alineadas con auto-ajuste
    def seccion_header(titulo):
        pdf.set_x(12)
        pdf.set_fill_color(226, 232, 240)
        pdf.set_text_color(15, 23, 42)
        pdf.set_font('Arial', 'B', 8.5)
        pdf.cell(W, 5.5, clean_str(f"  {titulo}"), 1, 1, 'L', fill=True)
        pdf.set_text_color(30, 41, 59)
        pdf.set_font('Arial', '', 8)

    def cell_ajustada(w, h, txt, border=1, ln=0, align='L', fill=False, bold=False, max_font=8, min_font=6.5):
        txt_clean = clean_str(txt)
        font_size = max_font
        pdf.set_font('Arial', 'B' if bold else '', font_size)
        while pdf.get_string_width(f" {txt_clean}") > (w - 1.5) and font_size > min_font:
            font_size -= 0.5
            pdf.set_font('Arial', 'B' if bold else '', font_size)
        pdf.cell(w, h, f" {txt_clean}" if align == 'L' else txt_clean, border=border, ln=ln, align=align, fill=fill)
        pdf.set_font('Arial', '', 8)

    def fila_2col(lab1, val1, lab2, val2):
        col_w = W / 2
        label_w = 42
        val_w = col_w - label_w
        
        pdf.set_x(12)
        # Columna 1
        pdf.set_fill_color(248, 250, 252)
        cell_ajustada(label_w, 5.2, lab1 + ":", border=1, ln=0, align='L', fill=True, bold=True)
        cell_ajustada(val_w, 5.2, val1, border=1, ln=0, align='L', fill=False, bold=False)
        
        # Columna 2
        pdf.set_fill_color(248, 250, 252)
        cell_ajustada(label_w, 5.2, lab2 + ":", border=1, ln=0, align='L', fill=True, bold=True)
        cell_ajustada(val_w, 5.2, val2, border=1, ln=1, align='L', fill=False, bold=False)

    def fila_full(label, valor):
        label_w = 42
        val_w = W - label_w
        pdf.set_x(12)
        pdf.set_fill_color(248, 250, 252)
        cell_ajustada(label_w, 5.2, label + ":", border=1, ln=0, align='L', fill=True, bold=True)
        cell_ajustada(val_w, 5.2, valor, border=1, ln=1, align='L', fill=False, bold=False)

    def bloque_texto(label, texto):
        pdf.set_x(12)
        pdf.set_font('Arial', 'B', 8)
        pdf.set_fill_color(248, 250, 252)
        pdf.cell(W, 4.8, clean_str(f" {label}:"), 'LTR', 1, 'L', fill=True)
        
        pdf.set_x(12)
        pdf.set_font('Arial', '', 8)
        txt_val = clean_str(texto or "No especificado")
        pdf.multi_cell(W, 4.5, f" {txt_val}", 'LBR', 'L')
        pdf.set_x(12) # Siempre resetear X tras multi_cell

    form_data = perfil.get("form_data") or {}
    if isinstance(form_data, str):
        try:
            import json
            form_data = json.loads(form_data)
        except Exception:
            form_data = {}

    # ── I. DATOS DE IDENTIFICACIÓN Y CONTACTO ──
    seccion_header("I. DATOS DE IDENTIFICACIÓN Y CONTACTO")
    nombre_completo = f"{perfil.get('nombre', '')} {perfil.get('apellido', '')}".strip()
    fila_2col("Nombres y Apellidos", nombre_completo, "Cédula de Identidad", perfil.get("cedula"))
    
    edad = perfil.get("edad") or form_data.get("edad") or "—"
    sexo = perfil.get("sexo") or form_data.get("sexo") or "—"
    fila_2col("Edad", f"{edad} años" if str(edad).isdigit() else edad, "Sexo", sexo)
    
    lugar_nac = perfil.get("lugar_nacimiento") or form_data.get("lugar_nacimiento") or "—"
    muni = perfil.get("municipio") or perfil.get("municipio_postulacion") or form_data.get("municipio") or "—"
    fila_2col("Lugar de Nacimiento", lugar_nac, "Municipio Residencia", muni)
    
    est_civil = perfil.get("estado_civil") or form_data.get("estado_civil") or "—"
    telefono = perfil.get("telefono") or form_data.get("telefono") or "—"
    fila_2col("Estado Civil", est_civil, "Teléfono", telefono)
    
    correo = perfil.get("correo") or perfil.get("email") or form_data.get("correo") or "—"
    fila_full("Correo Electrónico", correo)
    
    dir_hab = perfil.get("direccion") or form_data.get("direccion") or "—"
    fila_full("Dirección Habitación", dir_hab)
    
    carga_fam = perfil.get("carga_familiar") or form_data.get("carga_familiar") or "NO APLICA"
    bloque_texto("Detalle de Carga Familiar", carga_fam)
    
    pdf.ln(2.5)

    # ── II. PERFIL DE POSTULACIÓN Y CONDICIONES LABORALES ──
    seccion_header("II. PERFIL DE POSTULACIÓN Y CONDICIONES LABORALES")
    cargo = perfil.get("empleo_solicitado") or form_data.get("empleo_solicitado") or "—"
    sueldo = perfil.get("sueldo_aspira") or form_data.get("sueldo_aspira") or "—"
    fila_2col("Cargo Postulado", cargo, "Aspiración Salarial", sueldo)
    
    formacion = perfil.get("formacion") or form_data.get("formacion") or "—"
    trabaja_act = perfil.get("trabaja_actualmente") or form_data.get("trabaja_actualmente") or "—"
    fila_2col("Nivel de Instrucción", formacion, "Trabaja Actualmente", trabaja_act)
    
    disp_rot = perfil.get("disponibilidad_rotativa")
    if disp_rot is None:
        disp_rot = form_data.get("disponibilidad_rotativa")
    disp_fin = perfil.get("disponibilidad_fines")
    if disp_fin is None:
        disp_fin = form_data.get("disponibilidad_fines")
        
    disp_rot_txt = "Sí" if disp_rot in [True, 'Sí', 'si', 'Si', '1', 1] else ("No" if disp_rot is not None else "—")
    disp_fin_txt = "Sí" if disp_fin in [True, 'Sí', 'si', 'Si', '1', 1] else ("No" if disp_fin is not None else "—")
    fila_2col("Disp. Turnos Rotativos", disp_rot_txt, "Disp. Fines de Semana", disp_fin_txt)
    
    pdf.ln(2.5)

    # ── III. TRAYECTORIA LABORAL Y COMPETENCIAS ──
    seccion_header("III. TRAYECTORIA LABORAL Y COMPETENCIAS")
    exp_empleos = perfil.get("experiencia_ultimos_empleos") or form_data.get("experiencia_ultimos_empleos") or perfil.get("experiencia")
    bloque_texto("Resumen de Experiencia Laboral / Empleos Previos", exp_empleos)
    
    habilidades = perfil.get("habilidades") or form_data.get("habilidades")
    bloque_texto("Habilidades y Destrezas Técnicas", habilidades)
    
    fortalezas = perfil.get("fortalezas") or form_data.get("fortalezas")
    if fortalezas and str(fortalezas).strip():
        bloque_texto("Fortalezas Destacadas", fortalezas)
        
    motivacion = perfil.get("motivacion") or form_data.get("motivacion")
    bloque_texto("Motivación para laborar en Hotel Margarita Village", motivacion)
    
    referencias = perfil.get("referencias") or form_data.get("referencias")
    if referencias and str(referencias).strip():
        bloque_texto("Referencias Laborales y Personales", referencias)

    pdf.ln(2.5)

    # ── IV. LOGÍSTICA Y DATOS DE TRASLADO ──
    seccion_header("IV. LOGÍSTICA Y DATOS DE TRASLADO")
    medio_trans = perfil.get("medio_transporte") or form_data.get("medio_transporte") or "—"
    datos_banc = perfil.get("data_bancaria") or form_data.get("data_bancaria") or "—"
    
    fila_full("Medio de Transporte", medio_trans)
    fila_full("Datos Bancarios", datos_banc)

    pdf.ln(2.5)

    # ── V. REGISTRO DE EVALUACIONES TÉCNICAS Y ENTREVISTA ──
    seccion_header("V. REGISTRO DE EVALUACIONES Y SELECCIÓN TÉCNICA")
    
    if evaluacion:
        veredicto_ent = clean_str(evaluacion.get("veredicto", "Realizada"))
        evaluador = clean_str(evaluacion.get("evaluador_nombre", "Reclutador Talento Humano"))
        c_elegibles = evaluacion.get("elegible_count", 0)
        c_noelegibles = evaluacion.get("no_elegible_count", 0)
        ent_txt = f"Veredicto: {veredicto_ent} ({c_elegibles} Elegibles / {c_noelegibles} No Elegibles) - Evaluador: {evaluador}"
    else:
        ent_txt = "Pendiente de entrevista conductual"
        
    if examen:
        est_exam = clean_str(examen.get("estado", "Emitido"))
        puntaje = examen.get("puntaje")
        puntaje_txt = f"{puntaje} pts" if puntaje is not None else "Sin calificar"
        exam_txt = f"Estado: {est_exam} | Puntaje: {puntaje_txt}"
    else:
        exam_txt = "Pendiente por presentar prueba técnica"
        
    fila_full("Entrevista Presencial", ent_txt)
    fila_full("Evaluación Técnica", exam_txt)
    
    # Retornar buffer en memoria
    buffer = BytesIO()
    pdf_bytes = pdf.output(dest='S')
    if isinstance(pdf_bytes, str):
        buffer.write(pdf_bytes.encode('latin-1'))
    else:
        buffer.write(pdf_bytes)
    buffer.seek(0)
    return buffer


def generar_reporte_metricas_pdf(kpis, embudo, distribucion_cargos, rendimiento_pruebas, periodo="General"):
    """
    Genera el Informe Ejecutivo de Gestión y KPIs de Selección en PDF.
    Documento estadístico y de analítica para la Gerencia de Talento Humano.
    Sin recuadros de firmas ni solapamientos.
    """
    pdf = BaseCorporativoPDF(titulo_doc="Informe Ejecutivo de Gestión y KPIs")
    dibujar_encabezado_institucional(pdf, "Informe Ejecutivo de Inteligencia y Analítica de Selección")
    
    W = 186
    
    # Banner del reporte
    pdf.set_fill_color(30, 58, 138)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Arial', 'B', 10)
    pdf.cell(W, 7, clean_str("  PANEL DE INDICADORES CLAVE DE DESEMPEÑO (KPIS)"), 0, 1, 'L', fill=True)
    
    # Sub-barra de período
    pdf.set_fill_color(241, 245, 249)
    pdf.set_text_color(71, 85, 105)
    pdf.set_font('Arial', '', 8)
    fecha_hoy = datetime.now().strftime('%d/%m/%Y %H:%M')
    pdf.cell(W, 5.5, clean_str(f"  Período Evaluado: {periodo}  |  Fecha de Corte: {fecha_hoy}"), 1, 1, 'L', fill=True)
    pdf.ln(3.5)
    
    # ── CUADRÍCULA DE 4 KPIS PRINCIPALES (ALINEACIÓN PERFECTA) ──
    kpi_w = (W - 9) / 4 # 4 tarjetas con 3mm de separación
    kpi_h = 18
    y_cards = pdf.get_y()
    
    cards = [
        ("Total Aspirantes", str(kpis.get("total_aspirantes", 0)), "Volumen Histórico"),
        ("Postulados Recientes", str(kpis.get("postulados_semana", 0)), "Últimos 7 días"),
        ("Tasa de Conversión", f"{kpis.get('tasa_conversion', 0)}%", "Seleccionados / Total"),
        ("Efectividad Pruebas", f"{kpis.get('promedio_examen', 0)} pts", "Promedio Técnico / 20")
    ]
    
    for i, (titulo, valor, subtitulo) in enumerate(cards):
        x = 12 + i * (kpi_w + 3)
        
        # Fondo y borde del card
        pdf.set_fill_color(248, 250, 252)
        pdf.set_draw_color(203, 213, 225)
        pdf.rect(x, y_cards, kpi_w, kpi_h, style='DF')
        
        # Título
        pdf.set_xy(x, y_cards + 2)
        pdf.set_font('Arial', 'B', 7.5)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(kpi_w, 3.8, clean_str(titulo), 0, 1, 'C')
        
        # Valor grande
        pdf.set_x(x)
        pdf.set_font('Arial', 'B', 12.5)
        pdf.set_text_color(26, 54, 93)
        pdf.cell(kpi_w, 5.5, clean_str(valor), 0, 1, 'C')
        
        # Subtítulo
        pdf.set_x(x)
        pdf.set_font('Arial', 'I', 6.8)
        pdf.set_text_color(148, 163, 184)
        pdf.cell(kpi_w, 3.8, clean_str(subtitulo), 0, 1, 'C')
        
    # Continuar exactamente debajo de las 4 tarjetas
    pdf.set_xy(12, y_cards + kpi_h + 5)
    
    # ── 1. EMBUDO DE SELECCIÓN Y RETENCIÓN ──
    pdf.set_fill_color(226, 232, 240)
    pdf.set_text_color(15, 23, 42)
    pdf.set_font('Arial', 'B', 8.5)
    pdf.cell(W, 5.5, clean_str("  1. EMBUDO DE SELECCIÓN Y RETENCIÓN (RECRUITMENT FUNNEL)"), 1, 1, 'L', fill=True)
    
    # Encabezados de tabla embudo
    pdf.set_font('Arial', 'B', 8)
    pdf.set_fill_color(241, 245, 249)
    pdf.set_text_color(51, 65, 85)
    pdf.cell(66, 5.2, clean_str(" Etapa del Proceso"), 1, 0, 'L', fill=True)
    pdf.cell(40, 5.2, clean_str(" Candidatos"), 1, 0, 'C', fill=True)
    pdf.cell(40, 5.2, clean_str(" % Sobre Total"), 1, 0, 'C', fill=True)
    pdf.cell(40, 5.2, clean_str(" Retención"), 1, 1, 'C', fill=True)
    
    pdf.set_font('Arial', '', 8)
    pdf.set_text_color(30, 41, 59)
    for etapa in embudo:
        pdf.set_x(12)
        pdf.cell(66, 5, clean_str(f"  {etapa['etapa']}"), 1, 0, 'L')
        pdf.cell(40, 5, clean_str(str(etapa['cantidad'])), 1, 0, 'C')
        pdf.cell(40, 5, clean_str(f"{etapa['porcentaje_total']}%"), 1, 0, 'C')
        pdf.cell(40, 5, clean_str(f"{etapa.get('retencion', '—')}%"), 1, 1, 'C')
        
    pdf.ln(3.5)
    
    # ── 2. DEMANDA DE CARGOS Y CONCENTRACIÓN ──
    pdf.set_x(12)
    pdf.set_fill_color(226, 232, 240)
    pdf.set_text_color(15, 23, 42)
    pdf.set_font('Arial', 'B', 8.5)
    pdf.cell(W, 5.5, clean_str("  2. DEMANDA LABORAL: CARGOS MÁS SOLICITADOS"), 1, 1, 'L', fill=True)
    
    pdf.set_font('Arial', 'B', 8)
    pdf.set_fill_color(241, 245, 249)
    pdf.set_text_color(51, 65, 85)
    pdf.cell(106, 5.2, clean_str(" Cargo / Posición"), 1, 0, 'L', fill=True)
    pdf.cell(40, 5.2, clean_str(" Postulaciones"), 1, 0, 'C', fill=True)
    pdf.cell(40, 5.2, clean_str(" Participación"), 1, 1, 'C', fill=True)
    
    pdf.set_font('Arial', '', 8)
    pdf.set_text_color(30, 41, 59)
    for cargo in distribucion_cargos[:7]:
        pdf.set_x(12)
        pdf.cell(106, 5, clean_str(f"  {cargo['cargo']}"), 1, 0, 'L')
        pdf.cell(40, 5, clean_str(str(cargo['total'])), 1, 0, 'C')
        pdf.cell(40, 5, clean_str(f"{cargo['porcentaje']}%"), 1, 1, 'C')
        
    pdf.ln(3.5)

    # ── 3. RENDIMIENTO EN EVALUACIONES Y PRUEBAS ──
    pdf.set_x(12)
    pdf.set_fill_color(226, 232, 240)
    pdf.set_text_color(15, 23, 42)
    pdf.set_font('Arial', 'B', 8.5)
    pdf.cell(W, 5.5, clean_str("  3. DESEMPEÑO EN EVALUACIONES Y PRUEBAS TÉCNICAS"), 1, 1, 'L', fill=True)
    
    pdf.set_font('Arial', '', 8)
    pdf.set_text_color(30, 41, 59)
    
    mitad_w = W / 2
    pdf.set_x(12)
    pdf.cell(mitad_w, 5.2, clean_str(f" Total Evaluaciones Asignadas: {rendimiento_pruebas.get('total_examenes', 0)}"), 1, 0, 'L')
    pdf.cell(mitad_w, 5.2, clean_str(f" Evaluaciones Finalizadas: {rendimiento_pruebas.get('finalizados', 0)}"), 1, 1, 'L')
    
    pdf.set_x(12)
    pdf.cell(mitad_w, 5.2, clean_str(f" Tasa de Aprobación General: {rendimiento_pruebas.get('tasa_aprobacion', 0)}%"), 1, 0, 'L')
    pdf.cell(mitad_w, 5.2, clean_str(f" Calificación Promedio Obtenida: {rendimiento_pruebas.get('promedio_puntos', 0)} / 20 pts"), 1, 1, 'L')

    buffer = BytesIO()
    pdf_bytes = pdf.output(dest='S')
    if isinstance(pdf_bytes, str):
        buffer.write(pdf_bytes.encode('latin-1'))
    else:
        buffer.write(pdf_bytes)
    buffer.seek(0)
    return buffer
