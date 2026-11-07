#!/usr/bin/env python3
"""Genera una presentación vectorial editable (PPTX) y su PDF gemelo.

Requisitos: python-pptx, reportlab. Ejecutar desde cualquier directorio.
Diseño inspirado en la presentación de referencia del usuario; contenido original.
"""
from pathlib import Path
from math import pi, sin, cos
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor

OUT = Path(__file__).resolve().parent
W, H = 960, 540
C = {
    'dark':'#006064', 'deep':'#06464B', 'pale':'#DFF7F9', 'white':'#FFFFFF',
    'ink':'#005F63', 'body':'#008393', 'muted':'#5F949A', 'cyan':'#00BCD1',
    'green':'#43B64E', 'orange':'#FF5B2E', 'yellow':'#FFBE0B', 'cream':'#FAE7C7',
    'navy':'#233238', 'lightcard':'#E8F6F8', 'softgreen':'#E9F7EF',
    'softorange':'#FFF0E7', 'shadow':'#C7E5E8', 'coral':'#F47567',
    'textwhite':'#E3F7F7', 'teal2':'#20777A', 'terminal':'#27343A'
}
FONTS = Path('/usr/share/fonts/truetype/dejavu')
pdfmetrics.registerFont(TTFont('DVS', str(FONTS/'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DVS-B', str(FONTS/'DejaVuSans-Bold.ttf')))
pdfmetrics.registerFont(TTFont('DVM', str(FONTS/'DejaVuSansMono.ttf')))
prs = Presentation()
prs.slide_width = Inches(W / 72)
prs.slide_height = Inches(H / 72)
prs.core_properties.title = 'NEXO · Casa inteligente: misión, sensores y programación'
prs.core_properties.subject = 'Presentación didáctica de 15 páginas sobre el simulador NEXO'
prs.core_properties.author = 'Proyecto NEXO Smart Home Lab'
pdf = pdf_canvas.Canvas(str(OUT/'NEXO_Casa_Inteligente_15_Diapositivas.pdf'), pagesize=(W,H))
pdf.setTitle('NEXO · Casa inteligente — 15 diapositivas')
pdf.setAuthor('Proyecto NEXO Smart Home Lab')


def hx(color):
    return HexColor(C.get(color,color))

def rgb(color):
    v = C.get(color,color).strip('#')
    return RGBColor(int(v[:2],16),int(v[2:4],16),int(v[4:],16))

def inch(pt): return Inches(pt/72)

class Slide:
    def __init__(self, number, dark=False):
        self.number = number
        self.p = prs.slides.add_slide(prs.slide_layouts[6])
        self.dark = dark
        self.rect(0,0,W,H,'dark' if dark else 'pale')
        if 1 < number < 15:
            self.text(62,524,720,'NEXO  /  CASA INTELIGENTE  ·  SIMULACIÓN IoT',9,'muted',bold=True)
            self.text(875,522,50,f'{number:02d} / 15',10,'muted',bold=True,align='right')
    def rect(self,x,y,w,h,fill,r=0,stroke=None,sw=1,shadow=False):
        if shadow:
            self.rect(x+2,y+5,w,h,'shadow',r)
        pdf.setFillColor(hx(fill))
        if stroke:
            pdf.setStrokeColor(hx(stroke)); pdf.setLineWidth(sw)
        else: pdf.setStrokeColor(hx(fill))
        (pdf.roundRect if r else pdf.rect)(x,H-y-h,w,h,*([r] if r else []),stroke=int(bool(stroke)),fill=1)
        shape = self.p.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if r else MSO_SHAPE.RECTANGLE, inch(x),inch(y),inch(w),inch(h))
        shape.fill.solid(); shape.fill.fore_color.rgb = rgb(fill)
        if stroke:
            shape.line.color.rgb=rgb(stroke); shape.line.width=Pt(sw)
        else: shape.line.fill.background()
        return shape
    def line(self,x1,y1,x2,y2,color='cyan',width=2):
        pdf.setStrokeColor(hx(color));pdf.setLineWidth(width)
        pdf.line(x1,H-y1,x2,H-y2)
        shape=self.p.shapes.add_connector(MSO_CONNECTOR.STRAIGHT,inch(x1),inch(y1),inch(x2),inch(y2))
        shape.line.color.rgb=rgb(color);shape.line.width=Pt(width)
    def circle(self,x,y,r,fill,stroke=None,sw=1):
        pdf.setFillColor(hx(fill))
        if stroke: pdf.setStrokeColor(hx(stroke));pdf.setLineWidth(sw)
        pdf.circle(x,H-y,r,stroke=int(bool(stroke)),fill=1)
        sh=self.p.shapes.add_shape(MSO_SHAPE.OVAL,inch(x-r),inch(y-r),inch(r*2),inch(r*2))
        sh.fill.solid();sh.fill.fore_color.rgb=rgb(fill)
        if stroke: sh.line.color.rgb=rgb(stroke);sh.line.width=Pt(sw)
        else: sh.line.fill.background()
    def ring(self,x,y,r,color,width=2):
        pdf.setStrokeColor(hx(color));pdf.setLineWidth(width)
        pdf.circle(x,H-y,r,stroke=1,fill=0)
        sh=self.p.shapes.add_shape(MSO_SHAPE.OVAL,inch(x-r),inch(y-r),inch(2*r),inch(2*r))
        sh.fill.background();sh.line.color.rgb=rgb(color);sh.line.width=Pt(width)
    def polygon(self,pts,fill,stroke=None):
        p=pdf.beginPath();p.moveTo(pts[0][0],H-pts[0][1])
        for x,y in pts[1:]:p.lineTo(x,H-y)
        p.close();pdf.setFillColor(hx(fill))
        if stroke:pdf.setStrokeColor(hx(stroke));pdf.setLineWidth(1)
        pdf.drawPath(p,stroke=int(bool(stroke)),fill=1)
        # editable isosceles triangle for roof/arrow; use bbox and rotation only when needed
        xs=[v[0] for v in pts];ys=[v[1] for v in pts]
        if len(pts)==3:
            sh=self.p.shapes.add_shape(MSO_SHAPE.ISOSCELES_TRIANGLE,inch(min(xs)),inch(min(ys)),inch(max(xs)-min(xs)),inch(max(ys)-min(ys)))
            sh.fill.solid();sh.fill.fore_color.rgb=rgb(fill);sh.line.fill.background()
    def text(self,x,y,w,string,size=16,color='ink',bold=False,mono=False,align='left',leading=None,link=None):
        font='DVM' if mono else 'DVS-B' if bold else 'DVS'
        pptfont='DejaVu Sans Mono' if mono else 'DejaVu Sans'
        leading=leading or size*1.33
        lines=string.split('\n')
        # Wrap words to the same measured width for both formats.
        expanded=[]
        for line in lines:
            words=line.split(' ');cur=''
            for word in words:
                trial=(cur+' '+word).strip()
                if cur and pdfmetrics.stringWidth(trial,font,size)>w:
                    expanded.append(cur);cur=word
                else:cur=trial
            expanded.append(cur)
        pdf.setFillColor(hx(color));pdf.setFont(font,size)
        for i,line in enumerate(expanded):
            tw=pdfmetrics.stringWidth(line,font,size)
            px=x if align=='left' else x+w-tw if align=='right' else x+(w-tw)/2
            pdf.drawString(px,H-(y+i*leading)-size*.98,line)
        box=self.p.shapes.add_textbox(inch(x),inch(y),inch(w),inch(max(size+4,len(expanded)*leading+5)))
        tf=box.text_frame;tf.clear();tf.word_wrap=False
        tf.margin_left=Pt(0);tf.margin_right=Pt(0);tf.margin_top=Pt(0);tf.margin_bottom=Pt(0)
        for i,line in enumerate(expanded):
            pp=tf.paragraphs[0] if i==0 else tf.add_paragraph()
            pp.alignment={'left':PP_ALIGN.LEFT,'right':PP_ALIGN.RIGHT,'center':PP_ALIGN.CENTER}[align]
            pp.space_before=Pt(0);pp.space_after=Pt(0);pp.line_spacing=Pt(leading)
            run=pp.add_run();run.text=line;run.font.name=pptfont;run.font.size=Pt(size);run.font.bold=bold;run.font.color.rgb=rgb(color)
            if link:run.hyperlink.address=link
        if link:
            pdf.linkURL(link,(x,H-y-len(expanded)*leading,x+w,H-y),relative=0)
        return y+len(expanded)*leading
    def header(self,label,title,desc='',accent='orange'):
        self.text(62,54,820,label,14,accent,bold=True)
        self.text(62,79,850,title,36,'ink',bold=True,leading=42)
        if desc:self.text(62,149,840,desc,17,'body',leading=26)
    def card(self,x,y,w,h,accent='cyan',fill='white'):
        self.rect(x,y,w,h,fill,15,shadow=True)
        self.rect(x,y,7,h,accent,3)
    def note(self,y,string,accent='cyan'):
        self.card(62,y,836,45,accent)
        self.text(88,y+11,785,string,14,'ink',leading=20)
    def code(self,x,y,w,h,lines):
        self.rect(x,y,w,h,'terminal',18,shadow=True)
        for i,(line,col) in enumerate(lines):
            self.text(x+20,y+18+i*25,w-40,line,12,col,mono=True,leading=19)
    def done(self):pdf.showPage()

# 01 — Cover
s=Slide(1,True)
s.text(62,128,425,'MISIÓN NEXO',16,'cyan',bold=True)
s.text(62,163,440,'La casa que\nescucha tus pasos',42,'white',bold=True,leading=50)
s.text(62,330,425,'Un juego para descubrir sensores, actuadores y seguridad IoT.',18,'textwhite',leading=26)
s.rect(62,440,383,42,'teal2',13)
s.text(81,452,350,'6 SALAS   ·   9 PUNTOS   ·   1 MISIÓN',12,'white',bold=True)
s.rect(517,83,378,386,'cyan',30)
s.rect(524,90,364,372,'cream',24)
s.rect(540,105,332,290,'#FFF7EB',10)
# original house illustration
s.circle(705,224,114,'#FFFDF7')
s.polygon([(601,212),(705,132),(809,212)],'dark')
s.rect(618,202,174,139,'pale',8,'ink',2)
s.rect(686,267,42,74,'dark',7)
s.circle(717,306,3,'yellow')
for wx in (637,753):
    s.rect(wx,227,25,31,'cyan',4,'dark',1)
    s.line(wx+12,228,wx+12,257,'white',2)
s.circle(788,155,15,'yellow')
for r in (31,45,59):
    # simple concentric ultrasonic rings around the detector
    s.ring(822,270,r,'cyan',2)
s.circle(822,270,10,'dark')
s.rect(738,338,95,25,'softorange',8)
s.text(749,343,80,'+ 9 PTS',12,'orange',bold=True)
s.text(542,415,325,'La tecnología se convierte en aventura.',13,'deep',align='center')
s.done()

# 02 — Concept
s=Slide(2);s.header('LA IDEA','Una casa que responde a ti','No es una página de botones: caminar, acercarte o hacer ruido cambia lo que ocurre.')
for x,a,title,body,n in [
    (62,'cyan','1 · PERCIBE','Los sensores detectan distancia, luz y sonido.','⌁'),
    (346,'green','2 · DECIDE','El programa compara lecturas con reglas y umbrales.','?'),
    (630,'orange','3 · ACTÚA','Se abren puertas, se encienden luces o baja la reja.','→')]:
    s.card(x,236,268,190,a)
    s.circle(x+42,281,22,a);s.text(x+23,267,38,n,21,'white',bold=True,align='center')
    s.text(x+26,319,225,title,18,'ink',bold=True)
    s.text(x+26,355,216,body,15,'body',leading=22)
s.note(447,'Regla básica: si cambia una lectura, el escenario y el panel cambian juntos.','cyan')
s.done()

# 03 — Mission
s=Slide(3);s.header('LA MISIÓN','Consigue los 9 puntos','Empieza en el exterior, entra sin hacer ruido y recupera cada tesoro una sola vez.')
s.card(62,211,535,243,'cyan')
s.text(86,232,460,'6 SALAS = 6 PUNTOS',17,'ink',bold=True)
rooms=['Biblioteca','Laboratorio','Sala','Estudio','Cocina','Dormitorio']
for i,name in enumerate(rooms):
    col=i%2;row=i//2;x=86+col*245;y=273+row*52
    s.rect(x,y,225,42,'lightcard',9)
    s.circle(x+18,y+21,10,'yellow')
    s.text(x+40,y+11,175,name,13,'ink',bold=True)
    s.text(x+174,y+11,43,'+1',13,'orange',bold=True,align='right')
s.card(616,211,282,243,'yellow')
s.circle(756,287,40,'cream','yellow',3)
s.text(728,264,56,'▣',35,'ink',bold=True,align='center')
s.text(645,345,225,'CAJA FUERTE',18,'ink',bold=True,align='center')
s.text(645,383,225,'+3 puntos · solo agachado',14,'body',align='center')
s.note(470,'6 tesoros × 1 punto + caja fuerte × 3 puntos = 9 puntos posibles.','green')
s.done()

# 04 — Controls and route
s=Slide(4);s.header('CÓMO SE JUEGA','Del jardín a la caja fuerte','Los controles cambian tu velocidad; la velocidad cambia el ruido y las consecuencias.')
steps=[('01','ACÉRCATE','El ultrasónico abre la puerta principal.'),('02','CAMINA','Las seis puertas detectan hasta 1 metro.'),('03','RECOGE','Pulsa E junto al tesoro de cada sala.'),('04','AGÁCHATE','Abre la caja fuerte sin activar la alarma.')]
for i,(num,title,body) in enumerate(steps):
    x=62+i*213
    s.card(x,222,195,143,['cyan','green','yellow','orange'][i])
    s.text(x+21,238,60,num,20,['cyan','green','orange','orange'][i],bold=True)
    s.text(x+21,273,155,title,15,'ink',bold=True)
    s.text(x+21,300,157,body,12,'body',leading=18)
s.rect(62,388,836,94,'white',14,shadow=True)
for i,(key,act) in enumerate([('W A S D','Moverse'),('SHIFT','Correr'),('CTRL / C','Agacharse'),('E','Recoger')]):
    x=83+i*204
    s.rect(x,407,95,31,'dark',6)
    s.text(x+3,416,89,key,11,'white',bold=True,align='center')
    s.text(x,448,160,act,12,'body')
s.done()

# 05 — Map
s=Slide(5);s.header('EL ESCENARIO','Seis salas, seis tesoros','El pasillo conecta toda la casa. Las puertas interiores se abren solo al acercarte en silencio.')
s.rect(62,204,544,270,'white',14,shadow=True)
s.rect(298,221,72,225,'lightcard',7)
s.text(307,314,54,'PASILLO',10,'ink',bold=True,align='center')
names=[('BIBLIOTECA',80,224),('LABORATORIO',382,224),('SALA',80,299),('ESTUDIO',382,299),('COCINA',80,374),('DORMITORIO',382,374)]
for name,x,y in names:
    s.rect(x,y,207,68,'pale',8,'cyan',1)
    s.text(x+11,y+12,183,name,12,'ink',bold=True)
    s.circle(x+173,y+43,8,'yellow')
    s.text(x+146,y+32,16,'+1',9,'orange',bold=True)
for y in (258,333,408):
    s.circle(298,y,5,'green');s.circle(370,y,5,'green')
s.rect(311,445,46,26,'dark',5);s.text(318,450,32,'ENT',9,'white',bold=True)
s.rect(629,211,269,225,'white',14,shadow=True)
s.text(653,235,225,'LO QUE HAY EN CADA SALA',15,'ink',bold=True)
for i,(v,t) in enumerate([('01','Sensor ultrasónico · 1 m'),('02','Sensor de sonido'),('03','Servomotor de puerta'),('04','Tesoro de +1 punto')]):
    y=280+i*38;s.circle(664,y+5,13,['cyan','green','orange','yellow'][i]);s.text(652,y-2,24,v,9,'white',bold=True,align='center');s.text(687,y-4,193,t,12,'body')
s.text(632,455,264,'En la simulación hay 6 accesos virtuales.',11,'muted')
s.done()

# 06 — Ultrasound
s=Slide(6);s.header('EL SENSOR · PROXIMIDAD','El ultrasónico mide distancia','El HC-SR04 emite un sonido que rebota; el tiempo de regreso indica qué tan cerca estás.')
s.rect(62,215,435,248,'navy',20,shadow=True)
s.text(86,236,384,'HC-SR04  /  ECO',15,'cyan',bold=True)
s.rect(94,308,62,44,'lightcard',8)
s.circle(111,330,10,'dark');s.circle(140,330,10,'dark')
for r in (35,59,83):
    s.circle(180+r*.7,330,r*.32,'navy','cyan',2)
s.circle(396,331,24,'green')
s.text(353,376,86,'PERSONA',11,'textwhite',bold=True,align='center')
s.text(80,422,400,'Distancia ≈ tiempo del eco / 58  (cm)',13,'textwhite',mono=True)
for y,col,title,body in [
    (215,'cyan','1 metro en cada sala','Si estás a 100 cm o menos, el sensor te detecta.'),
    (297,'green','Puerta principal','Su alcance se puede ajustar en el simulador.'),
    (379,'orange','Otro uso real','Asistencia de estacionamiento y robots evita-obstáculos.')]:
    s.card(519,y,379,72,col);s.text(541,y+10,328,title,15,'ink',bold=True);s.text(541,y+35,332,body,12,'body',leading=17)
s.done()

# 07 — Servos and switches
s=Slide(7);s.header('ACTUADORES · MOVIMIENTO','Servos: una orden, un ángulo','Al detectar presencia en silencio, el programa cambia la posición de la puerta.')
s.card(62,215,421,221,'cyan')
s.text(91,239,338,'PUERTA AUTOMÁTICA',17,'ink',bold=True)
for x,angle,label in [(141,'0°','CERRADA'),(275,'45°','GIRANDO'),(409,'90°','ABIERTA')]:
    s.circle(x,324,29,'pale','cyan',2)
    s.line(x,324,x+(21 if angle=='90°' else 0),324-(20 if angle!='0°' else 0),'dark',7)
    s.text(x-37,362,74,angle,18,'ink',bold=True,align='center')
    s.text(x-48,390,96,label,10,'body',bold=True,align='center')
s.card(507,215,391,104,'green')
s.text(531,233,342,'FINALES DE CARRERA',16,'ink',bold=True)
s.text(531,263,343,'FC1 confirma cerrada; FC2 confirma abierta.\nSolo están instalados en la puerta principal.',12,'body',leading=19)
s.card(507,333,391,103,'orange')
s.text(531,350,342,'LAS SEIS SALAS',16,'ink',bold=True)
s.text(531,379,343,'Cada una tiene servo virtual de 0° a 90°;\nno son motores físicos conectados al UNO.',12,'body',leading=19)
s.note(454,'Otro uso del servo: brazo robótico, cámara orientable o dosificador.','yellow')
s.done()

# 08 — LDR
s=Slide(8);s.header('EL SENSOR · LUZ','La LDR detecta el día y la noche','Su valor analógico cambia con la luz. La casa usa esa lectura para encender lámparas.')
for x,color,title,metric,body,lamp in [
    (62,'yellow','DÍA','72 %','Mucha luz: lámparas apagadas.','OFF'),
    (490,'cyan','NOCHE','12 %','Poca luz: lámparas encendidas.','ON')]:
    s.card(x,227,408,205,color)
    s.circle(x+73,301,35,color)
    s.text(x+42,280,62,'☼' if title=='DÍA' else '●',31,'white',align='center')
    s.text(x+139,252,240,title,22,'ink',bold=True)
    s.text(x+139,294,235,metric,27,'body',bold=True)
    s.text(x+30,358,340,body,14,'body')
    s.rect(x+315,283,66,35,'dark' if lamp=='OFF' else 'yellow',7)
    s.text(x+318,291,60,lamp,12,'white' if lamp=='OFF' else 'ink',bold=True,align='center')
s.note(451,'En la simulación: < 38 % enciende las luces. La lectura LDR se muestra de 0 a 1023.','green')
s.text(71,500,800,'Otro uso: alumbrado público, invernaderos o control de persianas.',10,'muted')
s.done()

# 09 — Sound
s=Slide(9);s.header('EL SENSOR · SONIDO','Tus pasos son parte del juego','El ruido virtual depende de tu movimiento y se ve en un medidor en tiempo real.')
s.card(62,216,527,258,'cyan')
for i,(name,num,color) in enumerate([('Quieto',0,'muted'),('Agachado',6,'green'),('Caminando',22,'cyan'),('Corriendo',86,'orange')]):
    y=245+i*55
    s.text(84,y,160,name,15,'ink',bold=True)
    s.rect(248,y+3,272,18,'lightcard',8)
    if num:s.rect(248,y+3,max(num*2.72,16),18,color,8)
    s.text(527,y,43,f'{num}',15,color,bold=True,align='right')
s.card(610,216,288,115,'orange')
s.text(633,232,245,'SALAS: LÍMITE 48',16,'ink',bold=True)
s.text(633,264,246,'Correr bloquea el paso, incluso si el servo ya estaba abierto.',12,'body',leading=18)
s.card(610,344,288,130,'yellow')
s.text(633,362,245,'CAJA FUERTE: 58',16,'ink',bold=True)
s.text(633,393,245,'Si corres cerca, salta la alarma. El umbral es ajustable en la web.',12,'body',leading=18)
s.done()

# 10 — Security chain, dark section
s=Slide(10,True)
s.text(62,51,830,'PROTOCOLO DE SEGURIDAD',14,'cyan',bold=True)
s.text(62,79,830,'Si corres, la casa reacciona',36,'white',bold=True)
s.text(62,143,830,'La caja fuerte no se abre a la fuerza: ruido excesivo inicia una cadena de protección.',17,'textwhite')
security=[('01','MICRÓFONO','detecta ruido alto','cyan'),('02','ALARMA + LED','avisan del peligro','orange'),('03','L298N + 2 DC','despliegan la reja','yellow'),('04','PERSONA','retrocede y se aleja','green')]
for i,(num,title,body,color) in enumerate(security):
    x=62+i*213
    s.rect(x,220,193,178,'teal2',17)
    s.rect(x,220,193,7,color,3)
    s.circle(x+39,268,20,color)
    s.text(x+22,256,35,num,13,'white',bold=True,align='center')
    s.text(x+18,306,160,title,15,'white',bold=True)
    s.text(x+18,337,157,body,12,'textwhite',leading=17)
s.rect(92,435,776,47,'deep',13)
s.text(111,448,735,'El relé activa el buzzer. La reja permanece abajo hasta restablecer la alarma.',13,'textwhite',align='center')
s.text(71,510,820,'OTRO USO DEL L298N: conducir motores de un robot móvil.',10,'textwhite')
s.done()

# 11 — Monitoring center
s=Slide(11);s.header('CENTRO DE MONITOREO','Todo ocurre a la vista','El panel se mantiene visible y distingue sensores, actuadores y alertas.')
s.rect(62,210,408,272,'navy',20,shadow=True)
s.text(85,232,345,'NEXO  /  TELEMETRÍA',14,'cyan',bold=True)
for i,(name,val,col) in enumerate([('Ultrasónico entrada','78 cm','green'),('LDR exterior','737 / 1023','cyan'),('Sonido caja fuerte','22 / 100','yellow'),('Servomotor','90° abierto','green'),('Reja de seguridad','Levantada','muted')]):
    y=270+i*38;s.rect(85,y,360,32,'deep',6);s.circle(100,y+16,4,col)
    s.text(113,y+8,192,name,11,'textwhite');s.text(301,y+8,128,val,11,'textwhite',bold=True,align='right')
for y,col,title,body in [
    (210,'cyan','Sensores','Distancia, luz, sonido y finales de carrera.'),
    (302,'green','Actuadores','Servos, luces, buzzer, relé, LEDs y motores.'),
    (394,'orange','Cámaras virtuales','Exterior, entrada, pasillo y caja fuerte.')]:
    s.card(492,y,406,78,col);s.text(515,y+10,354,title,16,'ink',bold=True);s.text(515,y+38,355,body,12,'body')
s.done()

# 12 — Architecture
s=Slide(12);s.header('ASÍ SE PROGRAMÓ','Cuatro piezas que se hablan','La web usa HTML, CSS, JavaScript modular y un plano SVG. Sin dependencias de ejecución.')
mods=[('index.html','La estructura: guía, escena, controles y panel.','cyan'),('styles.css','Los colores, tarjetas, diseño adaptable y animaciones.','green'),('simulation.js','Reglas: velocidad, distancias, colisiones y puntos.','orange'),('scene.js + app.js','Dibujan la casa; conectan teclado, táctil y panel.','yellow')]
for i,(file,body,col) in enumerate(mods):
    x=62+(i%2)*426;y=221+(i//2)*111
    s.card(x,y,408,95,col)
    s.text(x+23,y+16,360,file,17,'ink',bold=True)
    s.text(x+23,y+49,358,body,12,'body',leading=18)
s.note(462,'Bucle del juego: leer entrada → actualizar reglas → dibujar escena y panel.','cyan')
s.done()

# 13 — Programming example
s=Slide(13);s.header('LA REGLA · EN SIMPLE','Si ocurre A, entonces pasa B','Las condiciones if unen el sensor y el actuador. Esta es la lógica resumida del acceso.')
s.code(62,217,520,230,[
    ('distancia = medirUltrasonico();','textwhite'),
    ('ruido = medirMovimiento();','textwhite'),
    ('','textwhite'),
    ('if (distancia <= 100 && ruido < 48) {','cyan'),
    ('  abrirServoDeLaSala();','textwhite'),
    ('} else if (corriendo) {','yellow'),
    ('  bloquearEntrada();','textwhite'),
    ('}','textwhite')])
s.card(604,217,294,102,'cyan')
s.text(627,236,245,'≤ 100 cm',20,'ink',bold=True)
s.text(627,270,245,'Se detecta una persona.',13,'body')
s.card(604,332,294,115,'orange')
s.text(627,350,245,'Ruido < 48',20,'ink',bold=True)
s.text(627,385,242,'Camina: se abre. Corre: se bloquea.',13,'body',leading=18)
s.note(465,'Es pseudocódigo para aprender; el código real separa sensores, movimiento y puertas.','green')
s.done()

# 14 — Modes and truthful hardware limits
s=Slide(14);s.header('DOS MODOS','Simular no es medir de verdad','El mismo panel puede enseñar una experiencia virtual o recibir lecturas físicas de un Arduino UNO.')
s.card(62,215,406,217,'cyan')
s.text(88,237,347,'MODO SIMULACIÓN',19,'ink',bold=True)
s.text(88,279,344,'Funciona en GitHub Pages sin Arduino.\nLas lecturas se calculan con variables\ndel juego y el avatar.',15,'body',leading=25)
s.rect(88,370,340,34,'lightcard',6)
s.text(100,379,316,'6 puertas interiores: virtuales',12,'ink',bold=True)
s.card(492,215,406,217,'green')
s.text(518,237,347,'MODO HARDWARE',19,'ink',bold=True)
s.text(518,279,344,'Arduino UNO envía JSON por USB a\n115200 baudios; Web Serial recibe\nlos datos en Chrome/Edge con HTTPS.',15,'body',leading=25)
s.rect(518,370,340,34,'softgreen',6)
s.text(530,379,316,'Sin conexión: no se inventan lecturas',12,'ink',bold=True)
s.note(451,'El UNO de referencia no conecta las 6 salas; la reja física se estima por tiempo.','orange')
s.done()

# 15 — Closing
s=Slide(15,True)
s.circle(480,87,31,'yellow')
s.text(456,66,48,'✦',29,'deep',bold=True,align='center')
s.text(125,136,710,'¡Misión completada!',43,'white',bold=True,align='center')
s.text(205,193,550,'Ya sabes cómo una casa percibe, decide y actúa.',18,'textwhite',align='center')
s.rect(130,249,700,196,'teal2',20)
s.text(169,270,620,'PARA RECORDAR HOY',15,'cyan',bold=True)
for i,(lead,rest) in enumerate([
    ('Ultrasónico:',' mide cercanía y abre puertas.'),
    ('LDR y sonido:',' transforman ambiente y pasos en decisiones.'),
    ('Servos y motores:',' convierten la lógica en movimiento.'),
    ('Simulación ≠ hardware:',' las lecturas reales nunca se inventan.')]):
    y=309+i*32;s.circle(178,y+10,5,'cyan')
    s.text(196,y,590,lead+rest,14,'white' if i==3 else 'textwhite')
s.text(120,469,720,'JUEGA EN  migulopez.github.io/maqueta-de-sistema-de-seguridad/',12,'textwhite',link='https://migulopez.github.io/maqueta-de-sistema-de-seguridad/')
s.text(120,501,720,'Presentación basada en el simulador NEXO · diagramas e ilustraciones originales.',9,'textwhite')
s.done()

assert len(prs.slides)==15
prs.save(str(OUT/'NEXO_Casa_Inteligente_15_Diapositivas.pptx'))
pdf.save()
print('Generados 15 slides:', OUT/'NEXO_Casa_Inteligente_15_Diapositivas.pdf', OUT/'NEXO_Casa_Inteligente_15_Diapositivas.pptx')
