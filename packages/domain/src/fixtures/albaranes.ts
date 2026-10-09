/** Fixtures de texto OCR (limpio / semi-ruidoso) para perfiles multi-albarán */

export const FIXTURE_EASYWMS = `
Albarán
easy WMS
Pack: 23
Orden de salida
Orden de salida: DL_004
Fecha orden: 14/12/2024
Destino María García Sanz
Origen SPRTS
Nº Line Artículo Descripción Cant. enviada Peso individual (kg) Peso (kg)
1 086872 CALZADO DEPORTIVO 6 0,4 kg 1 kg
1 011134 CALCETINES S2000 10 0,1 kg 0,5 kg
1 000357 SPRAY H-T 1 0,2 kg 0,4 kg
Peso total (kg) 1,9 kg
`;

/** Hoja de picking easy WMS (tareas + ItemXX + ubicación) */
export const FIXTURE_EASYWMS_PICKING = `
Hoja de picking
easy WMS
Orden de salida
Batch:
Batch00000000000000000002
Orden: OUT00602/050
Cuenta: CUSTOMER03
Transporte:
Destino: MEXP01
Tareas: 6
Tarea Número de tarea Ubicación Artículo Rpt_ShippingOrderPaperTask_Description_lbl Cantidad
8805 5D 1 1 Item12 Chocolate cookies 1 [UN]
8803 5I 1 1 Item02 Tomato sauce 1 [UN]
8802 5D 4 1 Item01 Aftershave lotion 1 [UN]
8806 2I 2 3 Item23 Spaghetti pasta 500g 1 [UN]
8807 1I 1 2 Item24 Beans with tomato 500g 1 [UN]
8804 4I 1 1 Item09 Washing detergent 50 loads 1 [UN]
09/04/2020 10:31:05
Page 1/1
`;

export const FIXTURE_PICKING_LIST = `
Picking List
Webshop name
Printed: 02/18/2020 at 10:25 a.m. 3 Orders
Order ID #1849201
Customer Customer Name
Items Properties SKU QTY
Product name 10031 1
Product name 10033 1
Product name 20054 1
Order ID #1849202
Customer Customer Name
Product name 10031 1
Product name 10031 2
Product name 10033 2
Product name 10032 2
Order ID #1849203
Product name 10033 1
Product name 20031 3
Product name 10032 2
`;

export const FIXTURE_FASHION = `
ALBARÁN
Empresa SL
16/12/2020
AL-2020-0001
Sociedad Limitada SL
CONCEPTO UDS. BASE UD. % DTO BASE TOTAL % I.V.A. I.V.A.
SKU000002 - Pantalón Génova 20 15,00€ 20 240,00€ 21 50,40€
Recto, pana, rayas. Color crema.
SKU000008 - Abrigo Polo Norte 10 80,00€ 30 560,00€ 21 117,60€
SKU000009 - Bufanda Pirenaica 40 7,00€ 0 280,00€ 21 58,80€
SKU000001 - Jersey Navidad 10 12,00€ 0 120,00€ 21 25,20€
SKU000007 - Calcetines Sevilla 60 5,00€ 0 300,00€ 21 63,00€
BASE IMPONIBLE 1.500,00 €
TOTAL 1.815,00 €
`;

export const FIXTURE_TOSMA = `
ALBARÁN
Cloud Gestion
Electricidad - Fontanería Tosma S.L.
Nº Albarán: A / 129
Fecha Albarán: 28-04-2023
Jose Antonio Martín López
Cod. Concepto Ud. Precio Dto Importe
000113 Válvula antirretorno doble clapeta 2 DN50 20.00 48,83 976,60
77 Membrana flujostato válvula 5 vías 12.00 25,00 5 285,00
00120 Racor 359GCu recto para gas c/precinto 1/2 x 15 4.00 1,38 5,52
000107 Aro cera para inodoros 21.00 6,75 141,75
97 Caldera Celini ACU2 3.00 2.101,00 6.303,00
B. Imponible 7.711,87 €
IVA 21.00% 1.619,49 €
Total Albarán 9.331,36 €
`;

export const FIXTURE_OC = `
Empresa Falsa A
ORDEN DE COMPRA
FECHA: 15/01/2020
Número de Orden: OC 00005
ARTÍCULO # DESCRIPCIÓN Cantidad P/U TOTAL
78958 Producto X 2 10,00 € 20,00 €
14455 Producto T 5 50,00 € 250,00 €
66888 Producto H 1 200,00 € 200,00 €
Subtotal 570,00 €
TOTAL 689,70 €
`;

/**
 * Albarán logística: OCR por columnas (códigos / descripciones / uds en bloques).
 * Caso real: el texto sale bien pero desordenado.
 */
export const FIXTURE_ALB_CODIGO_OCR = `
LOGOTIPO ALBARÁN DE ENTREGA
Logística y Distribución S.L. Nº Albarán: ALB-2026-0842
Av. de la Industria, 45, Nave 3 Fecha: 09 Octubre 2026
28045 Madrid, España
Nº Pedido: PED-9931-X
NIF: B-12345678
Tlf: +34 900 123 456 Agente: M. Gómez
Lugar de Entrega (Destinatario)
Comercializadora del Sur, S.A.
C/ Gran Vía, 12, Planta Baja
41001 Sevilla, España
Atención a: Dpto. de Recepción
Tlf Contacto: +34 600 000 000
Código
ART-0012
ART-0054
CBL-1020
SOP-9921
Observaciones:
ser revisada antes de la firma de este documento.
Albarán ALB-2026-0842 - Logística y Distribución S.L.
Descripción del Artículo
Monitores LED 24" Resolut Pro
Teclados Mecánicos TKL (Layout ES)
Cables HDMI 2.1 (Bobina 20m)
Soporte articulado de pared VESA 100
Entregar por el muelle de carga trasero. Horario de recepción de 09:00 a 14:00h. La mercancía debe
Datos de Transporte
Transportista: TransRápidos S.A.
Matrícula: 4392-LXX
Bultos Totales: 4 palets
Peso Total: 340 kg
Método: Entrega Estándar 48h
Uds/Cajas Cantidad Total
10 10 uds
5 25 uds
2 50 uds
1 10 uds
Página 1
`;
