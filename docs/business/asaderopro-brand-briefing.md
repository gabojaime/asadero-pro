# Brand & Design Briefing: Asadero Pro
**Documento de Comunicación para el Diseñador de Marca e Interfaz**

Este documento organiza la visión, objetivos y reglas de diseño específicas de **Asadero Pro** con el fin de guiar al equipo de diseño en la creación de la imagen de marca y el diseño del landing page principal. Este briefing se apoya estrictamente en las directrices técnicas del archivo `design.md` [1, 2, 4].

---

## 1. ¿Qué es Asadero Pro?
**Asadero Pro** es una plataforma SaaS de alto rendimiento diseñada específicamente para la gestión operativa y financiera de asaderos de carne, pollo y cerdo. 

A diferencia de los sistemas POS genéricos para restaurantes, **Asadero Pro** resuelve el problema más crítico del negocio de asados: la volatilidad de los precios de la carne y el control del inventario en crudo (por kilogramos con precisión de tres decimales) frente a las porciones cocidas vendidas. El sistema automatiza el descuento de existencias crudas mediante recetas parametrizadas y realiza un seguimiento milimétrico de las mermas (porciones quemadas, grasa retirada, mal corte) para maximizar la rentabilidad de la cocina.

---

## 2. Visión e Identidad de la Marca
Buscamos distanciarnos por completo del cliché visual de los restaurantes de comida rápida. **Asadero Pro** no es una aplicación rústica o informal; se posiciona como una herramienta de ingeniería de precisión culinaria.

*   **La Visión**: Elevar la gestión del asadero tradicional a una operación científica guiada por datos en tiempo real.
*   **La Estética**: Denominada **"Reverencia por el Oficio"** o **"Invisible UI"** [1]. La marca debe transmitir elegancia, pulcritud, acero templado, fuego controlado y precisión matemática. Evitaremos caricaturas de parrillas, llamas animadas o tipografías rústicas tipo "salón del viejo oeste". Trataremos el fuego, el metal y el producto (los cortes de carne) con el mismo respeto con el que se trata un producto tecnológico premium [1, 3].
*   **El Protagonista**: La interfaz del software y la fotografía hiper-realista del producto (la carne jugosa sobre las brasas y los gráficos limpios del dashboard) son los héroes visuales. El diseño cromático de la web debe retroceder para que ellos destaquen [1, 4].

---

## 3. Objetivos del Landing Page Principal
1.  **Captación de Alta Conversión**: Comunicar instantáneamente la propuesta de valor en un titular potente de una sola línea y un CTA de alto voltaje [1].
2.  **Demostración Visual**: Mostrar pantallas impecables de la aplicación que demuestren lo sencillo que es para un parrilero o administrador registrar una merma o visualizar el costo de alimentos (*Food Cost*).
3.  **Autoridad Técnica**: Presentar los beneficios de la Arquitectura Hexagonal (rapidez offline, robustez de datos) y la inmutabilidad como sinónimos de paz mental para el dueño del negocio [13, 23, 25].

---

## 4. Guía de Estilo y Tokens Visuales (Traducción de `design.md`)

Para asegurar la coherencia estética con el sistema de desarrollo, el diseñador debe limitar su paleta, tipografía y formas a los siguientes tokens inspirados en los estándares visuales de Apple [1, 2]:

### A. Paleta Cromática Restringida (Sparing, Voltage-driven) [1, 5]
La interfaz utiliza una escala de grises rica y profunda con **un único acento cromático activo** que representa la brasa del asadero:

*   **Interactive Accent (Flame Red)**: `#e11d48` (un rojo vivo, profundo y eléctrico). Se usa exclusivamente para enlaces de interés, botones de llamada a la acción primarios (Pill CTAs) y focos de interacción crítica [1, 4, 6]. **No existe ningún otro color de marca secundario** [4].
*   **Surface Light (Canvases)**:
    *   Canvas Base: `#ffffff` (Blanco puro para fondos de bajo impacto) [6].
    *   Canvas Parchment: `#f5f5f7` (Gris parchment suave para el fondo de la página, separando bloques visuales) [6].
    *   Surface Pearl: `#fafafc` (Para tarjetas e interfaces que descansan sobre el canvas) [6].
*   **Surface Dark (Tiles)**:
    *   Surface Tile 1: `#272729` (Gris carbón oscuro para bloques de navegación y sliders) [6].
    *   Surface Tile 2: `#2a2a2c` [6].
    *   Surface Black: `#000000` (Fondo negro sólido para secciones de contraste extremo) [6].
*   **Text Ladder (Ink & Muted)**:
    *   Ink: `#1d1d1f` (Gris casi negro para máxima legibilidad, nunca negro puro sobre fondos claros) [6].
    *   Body: `#1d1d1f` (Ajustado a 17px de tamaño base para emular la cadencia de lectura de Apple) [4, 6].
    *   Body Muted: `#7a7a7a` o `#cccccc` (Para etiquetas secundarias e indicadores del dashboard) [6].

### B. Tipografía Estricta (Cadencia Compacta)
*   **Tipografía de Encabezados y UI**: **SF Pro Display** (para titulares superiores a 20px) y **SF Pro Text** (para el cuerpo de lectura y componentes de UI) [2, 5].
*   **Rendimiento Tipográfico**: Los titulares deben llevar un espaciado de caracteres negativo (*letter-spacing* negativo) para emular la silueta tipográfica de Apple, apretada y de gran peso visual [4].
*   **La Regla de los Pesos**: El peso tipográfico 500 (Medium) está **completamente prohibido** [2, 4]. La tipografía solo discurre a través de los pesos **300 (Light), 400 (Regular), 600 (Semibold) y 700 (Bold)** [2, 5]. El peso 300 se reservará para titulares de gran tamaño que busquen un aire de sofisticación y ligereza [4].

### C. Estructura de Diseño por Mosaicos (Alternating Tile Rhythm) [4]
El landing page no debe utilizar bordes toscos, líneas divisorias ni sombras artificiales [4]. El flujo de lectura se define mediante el **ritmo de mosaicos alternantes (tiles)**:
*   La página es una pila vertical de contenedores que van de borde a borde de la pantalla (*edge-to-edge tiles*) [1].
*   Cada sección alterna su fondo entre un lienzo claro (`#ffffff` o `#f5f5f7`) y un lienzo oscuro (`#272729` o `#000000`) [1, 6]. **El propio cambio de color de fondo es el divisor de sección** [4].
*   Las formas de interacción de los componentes de shadcn/ui tendrán un redondeo de esquina mixto (**Base Radius: 11px/12px**), otorgando un aspecto amigable pero profesional [2, 5].

---

## 5. Estructura Conceptual del Landing Page

El diseñador estructurará el landing page bajo un flujo narrativo claro de arriba a abajo:

```
┌──────────────────────────────────────────────────────────┐
│             NAV (Minimal, Logo, Acceso, Button Primary)  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Hero Headline - Bold Tight Typography]                 │
│  [Tagline - One line explaining the SaaS]                │
│  [Two Red Pill CTAs]                                     │
│                                                          │
│  [Hero Mockup: Impossibly Crisp Software Render]         │
│  (Muestra el panel financiero con Food Cost y Mermas)    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  TILE 1 (Canvas Light - #f5f5f7)                         │
│  "La merma en parrilla es dinero quemado..."             │
│  Enfoque matemático en la merma del asador (Overcooked)  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  TILE 2 (Canvas Dark - #272729)                          │
│  Mosaico de 3 columnas mostrando las métricas clave:     │
│  1. Food Cost % (Target: 30-35%)                         │
│  2. Margen de Contribución por corte                     │
│  3. Rotación de Mesas y Ticket Promedio                  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  TILE 3 (Canvas Light - #ffffff)                         │
│  "Precisión milimétrica desde el inventario en crudo"    │
│  Cómo el sistema conecta compras y recetas en Supabase   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  CTA FINAL (Canvas Dark - #000000)                       │
│  Un lienzo negro sobrio con el Flame Red CTA             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Entregables Esperados para el Diseñador

Para avanzar a la etapa de maquetación en Next.js con Tailwind CSS y componentes de shadcn/ui [112, 116], solicitamos al diseñador:

1.  **Manual de Identidad de Marca**: Diseño del logotipo de "Asadero Pro" empleando la tipografía SF Pro [2, 5], el color Flame Red [4, 6], y un isotipo minimalista basado en geometría pura (evitando clichés rústicos).
2.  **Diseño UI de Alta Fidelidad para Escritorio y Móvil**:
    *   El Landing Page completo siguiendo el ritmo de mosaicos alternos [4].
    *   La maqueta del Dashboard de Métricas de Negocio, utilizando tarjetas estilizadas de shadcn/ui (Cards con un radio de 11px) [2, 5].
3.  **Recursos Visuales**: Renders limpios del software aplicados sobre dispositivos en formato PNG con fondo transparente, listos para ser optimizados con el componente `<Image>` de Next.js [133, 134].
