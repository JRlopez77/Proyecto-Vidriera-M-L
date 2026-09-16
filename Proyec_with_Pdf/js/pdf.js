async function generarPDF() {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  await configurarFuentePDF(doc);

  const datos = obtenerDatosDocumento();
  const filas = obtenerFilasParaPDF();

  if (!Number.isInteger(datos.plazoEntrega) || datos.plazoEntrega < 1) {
    alert("Ingresa un plazo de entrega valido en dias habiles.");
    document.getElementById("plazoEntrega").focus();
    return;
  }

  if (filas.length === 0) {
    alert("Debes agregar al menos un producto.");
    return;
  }

  guardarCotizacion(false);

  const paginas = dividirEnPaginas(filas, 9);

  for (let i = 0; i < paginas.length; i++) {
    if (i > 0) doc.addPage();

    await dibujarEncabezado(doc, datos, i + 1, paginas.length);
    const inicioTabla = dibujarDatosCliente(doc, datos);
    await dibujarTabla(doc, paginas[i], i + 1, paginas.length, inicioTabla);

    if (i === paginas.length - 1) {
      dibujarCierreDocumento(doc, datos);
    }
  }

  const totalPaginasReales = doc.internal.getNumberOfPages();
  for (let pagina = 1; pagina <= totalPaginasReales; pagina++) {
    doc.setPage(pagina);
    dibujarPiePagina(doc, pagina, totalPaginasReales);
  }

  doc.save(`${datos.numero}.pdf`);
}

async function configurarFuentePDF(doc) {
  const fuente = window.ARIAL_TTF_BASE64 || await cargarArchivoBase64("fonts/arial.ttf");

  if (!fuente) return;

  doc.addFileToVFS("arial.ttf", fuente);
  doc.addFont("arial.ttf", "ArialLocal", "normal");
  doc.addFont("arial.ttf", "ArialLocal", "bold");
  doc.setFont("ArialLocal", "normal");
}

function obtenerDatosDocumento() {
  const tipo = typeof tipoDocumentoActual === "function" ? tipoDocumentoActual() : "cotizacion";
  const numeroCotizacion = document.getElementById("numeroCotizacion").value;
  const numeroFactura = document.getElementById("numeroFactura").value.trim();

  return {
    tipo,
    titulo: tipo === "factura" ? "FACTURA" : "COTIZACION DE VENTANAS Y PUERTAS",
    numero: tipo === "factura" ? numeroFactura || numeroCotizacion.replace("COT", "FAC") : numeroCotizacion,
    referenciaCotizacion: numeroCotizacion,
    cliente: document.getElementById("cliente").value || "Sin cliente",
    telefono: document.getElementById("telefono").value || "-",
    correo: document.getElementById("correo").value || "-",
    proyecto: document.getElementById("proyecto").value || "-",
    fecha: document.getElementById("fecha").value || "-",
    observaciones: document.getElementById("observaciones").value || "-",
    plazoEntrega: Number(document.getElementById("plazoEntrega").value),
    identificacion: document.getElementById("identificacionFactura").value || "-",
    condicionVenta: document.getElementById("condicionVenta").value || "-",
    metodoPago: document.getElementById("metodoPago").value || "-",
    direccion: document.getElementById("direccionFactura").value || "-"
  };
}

function obtenerFilasParaPDF() {
  const filas = [];

  document.querySelectorAll("#detalleCotizacion tr").forEach((fila) => {
    const tipoId = fila.querySelector(".tipoVentana").value;
    const ventana = obtenerVentanaPorId(tipoId);
    const tipoPersonalizado = fila.querySelector(".tipo-personalizado").value.trim();
    const sinMedidas = fila.querySelector(".sinMedidas").checked;
    const medidas = sinMedidas ? "Sin medidas" : fila.querySelector(".medidas").value || "-";
    const colorAluminio = fila.querySelector(".colorAluminio").value;
    const colorVidrio = fila.querySelector(".color-vidrio").value.trim();
    const descripcionBase = fila.querySelector(".descripcion").value.trim();
    const descripcion = [
      descripcionBase || "-",
      colorVidrio ? `Vidrio: ${colorVidrio}` : ""
    ].filter(Boolean).join("\n");

    filas.push({
      imagen: ventana.imagen,
      tipo: tipoId === "otro" ? tipoPersonalizado || "Otro" : ventana.nombre,
      medidas,
      color: colorVidrio ? `Aluminio: ${colorAluminio} / Vidrio: ${colorVidrio}` : `Aluminio: ${colorAluminio}`,
      unidad: fila.querySelector(".unidad").value,
      cantidad: fila.querySelector(".cantidad").value,
      precio: obtenerNumero(fila.querySelector(".precio").value),
      descripcion,
      total: obtenerNumero(fila.dataset.total)
    });
  });

  return filas;
}

function dividirEnPaginas(array, cantidadPorPagina) {
  const paginas = [];

  for (let i = 0; i < array.length; i += cantidadPorPagina) {
    paginas.push(array.slice(i, i + cantidadPorPagina));
  }

  return paginas;
}

async function dibujarEncabezado(doc, datos) {
  const logo = await cargarImagenBase64("img/logo.png");

  if (logo) {
    doc.addImage(logo, "PNG", 14, 10, 32, 20);
  }

  doc.setFontSize(18);
  doc.setFont("ArialLocal", "bold");
  doc.text(datos.titulo, 150, 18, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("ArialLocal", "normal");
  doc.text(`Documento: ${datos.numero}`, 238, 14);
  doc.text(`Fecha: ${datos.fecha}`, 238, 21);

  if (datos.tipo === "factura") {
    doc.text(`Cotizacion base: ${datos.referenciaCotizacion}`, 238, 28);
  }

  doc.line(14, 35, 283, 35);
}

function dibujarDatosCliente(doc, datos) {
  doc.setFontSize(11);
  doc.setFont("ArialLocal", "bold");
  doc.text("Datos del cliente", 14, 45);

  doc.setFont("ArialLocal", "normal");
  doc.text(`Cliente: ${datos.cliente}`, 14, 53);
  doc.text(`Proyecto: ${datos.proyecto}`, 105, 53);
  doc.text(`Telefono: ${datos.telefono}`, 14, 60);
  doc.text(`Correo: ${datos.correo}`, 105, 60);

  if (datos.tipo !== "factura") {
    return 70;
  }

  doc.text(`Identificacion: ${datos.identificacion}`, 14, 67);
  doc.text(`Condicion: ${datos.condicionVenta}`, 105, 67);
  doc.text(`Metodo de pago: ${datos.metodoPago}`, 14, 74);
  doc.text(`Direccion: ${datos.direccion}`, 105, 74);

  return 84;
}

async function dibujarTabla(doc, filas, paginaActual, totalPaginas, startY) {
  const body = [];

  for (const item of filas) {
    const img = await cargarImagenConMedidas(item.imagen);

    body.push([
      {
        content: "",
        imagen: img ? img.dataUrl : null,
        imagenAncho: img ? img.width : 0,
        imagenAlto: img ? img.height : 0
      },
      item.tipo,
      item.medidas,
      item.color,
      item.unidad,
      item.cantidad,
      formatoMoneda(item.precio),
      item.descripcion,
      formatoMoneda(item.total)
    ]);
  }

  doc.setFontSize(9);
  doc.setFont("ArialLocal", "normal");
  doc.text(`Bloque ${paginaActual} de ${totalPaginas}`, 14, startY - 5);

  doc.autoTable({
    startY,
    head: [[
      "Img",
      "Tipo",
      "Medidas",
      "Colores",
      "Unidad",
      "Cant.",
      "Precio",
      "Descripcion",
      "Total"
    ]],
    body,
    styles: {
      font: "ArialLocal",
      fontSize: 7.6,
      cellPadding: 2,
      valign: "middle"
    },
    headStyles: {
      fillColor: [29, 53, 87],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    columnStyles: {
      0: { cellWidth: 24, minCellHeight: 14 },
      1: { cellWidth: 29 },
      2: { cellWidth: 24 },
      3: { cellWidth: 32 },
      4: { cellWidth: 15 },
      5: { cellWidth: 14 },
      6: { cellWidth: 27, halign: "right" },
      7: { cellWidth: 66 },
      8: { cellWidth: 28, halign: "right" }
    },
    didDrawCell: function (data) {
      if (data.column.index === 0 && data.cell.raw.imagen) {
        const anchoMaximo = data.cell.width - 4;
        const altoMaximo = data.cell.height - 4;
        const escala = Math.min(
          anchoMaximo / data.cell.raw.imagenAncho,
          altoMaximo / data.cell.raw.imagenAlto
        );
        const ancho = data.cell.raw.imagenAncho * escala;
        const alto = data.cell.raw.imagenAlto * escala;
        const x = data.cell.x + (data.cell.width - ancho) / 2;
        const y = data.cell.y + (data.cell.height - alto) / 2;

        doc.addImage(
          data.cell.raw.imagen,
          "PNG",
          x,
          y,
          ancho,
          alto
        );
      }
    },
    margin: { left: 14, right: 14 }
  });
}

function dibujarCierreDocumento(doc, datos) {
  let y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 135) + 9;

  if (y > 143) {
    doc.addPage();
    y = 28;
  }

  dibujarObservaciones(doc, datos.observaciones, y);
  dibujarTotales(doc, y);

  if (datos.tipo === "factura") {
    dibujarDatosFacturaFinal(doc, datos, y + 36);
    return;
  }

  dibujarPoliticas(doc, datos, y + 36);
}

function dibujarTotales(doc, y) {
  const ventaNeta = document.getElementById("ventaNeta").textContent;
  const iva = document.getElementById("iva").textContent;
  const totalGeneral = document.getElementById("totalGeneral").textContent;
  const incluyeIVA = cotizacionConIVA();

  doc.setFontSize(11);
  doc.setFont("ArialLocal", "bold");

  doc.text("Venta neta:", 215, y);
  doc.text(ventaNeta, 280, y, { align: "right" });

  doc.text(incluyeIVA ? "IVA 13%:" : "IVA:", 215, y + 8);
  doc.text(iva, 280, y + 8, { align: "right" });

  doc.setFontSize(13);
  doc.text("Total:", 215, y + 18);
  doc.text(totalGeneral, 280, y + 18, { align: "right" });
}

function dibujarObservaciones(doc, observaciones, yInicial) {
  doc.setFontSize(10);
  doc.setFont("ArialLocal", "bold");
  doc.text("Observaciones:", 14, yInicial);

  doc.setFont("ArialLocal", "normal");

  const texto = doc.splitTextToSize(observaciones, 180);
  doc.text(texto, 14, yInicial + 8);
}

function dibujarDatosFacturaFinal(doc, datos, y) {
  if (y > 178) {
    doc.addPage();
    y = 28;
  }

  doc.setFontSize(10);
  doc.setFont("ArialLocal", "bold");
  doc.text("Datos de factura", 14, y);

  doc.setFont("ArialLocal", "normal");
  doc.text(`Condicion de venta: ${datos.condicionVenta}`, 14, y + 8);
  doc.text(`Metodo de pago: ${datos.metodoPago}`, 14, y + 15);
  doc.text(`Identificacion: ${datos.identificacion}`, 105, y + 8);
  doc.text(`Direccion: ${datos.direccion}`, 105, y + 15);
}

function dibujarPoliticas(doc, datos, y) {
  const totales = obtenerTotalesNumericos();
  const porcentajeAdelanto = obtenerPorcentajeAdelanto();
  const porcentajeRestante = 100 - porcentajeAdelanto;
  const adelanto = totales.total * (porcentajeAdelanto / 100);
  const restante = totales.total - adelanto;

  if (y > 178) {
    doc.addPage();
    y = 28;
  }

  doc.setFontSize(10);
  doc.setFont("ArialLocal", "bold");
  doc.text("Politicas comerciales", 14, y);

  doc.setFont("ArialLocal", "normal");

  const politicas = [
    `Se solicita al cliente un adelanto del ${porcentajeAdelanto}% para iniciar el proyecto. Adelanto requerido: ${formatoMoneda(adelanto)}.`,
    `Al finalizar el trabajo, el cliente debera cancelar el ${porcentajeRestante}% restante. Monto restante: ${formatoMoneda(restante)}.`,
    `El plazo estimado de entrega del proyecto es de ${datos.plazoEntrega} ${datos.plazoEntrega === 1 ? "dia habil" : "dias habiles"} despues de confirmado el adelanto.`
  ];

  let posicionY = y + 8;

  politicas.forEach((texto) => {
    const lineas = doc.splitTextToSize(`- ${texto}`, 180);
    doc.text(lineas, 14, posicionY);
    posicionY += lineas.length * 5 + 3;
  });
}

function dibujarPiePagina(doc, paginaActual, totalPaginas) {
  doc.setFontSize(9);
  doc.setFont("ArialLocal", "normal");
  doc.text(
    `Pagina ${paginaActual} de ${totalPaginas}`,
    150,
    203,
    { align: "center" }
  );
}

function obtenerTotalesNumericos() {
  const filas = document.querySelectorAll("#detalleCotizacion tr");
  let ventaNeta = 0;

  filas.forEach((fila) => {
    ventaNeta += parseFloat(fila.dataset.total || 0);
  });

  const iva = cotizacionConIVA() ? ventaNeta * IVA_PORCENTAJE : 0;
  const total = ventaNeta + iva;

  return {
    ventaNeta,
    iva,
    total
  };
}

function cargarImagenBase64(ruta) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = function () {
      resolve(null);
    };

    img.src = ruta;
  });
}

function cargarImagenConMedidas(ruta) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      resolve({
        dataUrl: canvas.toDataURL("image/png"),
        width: img.width || 1,
        height: img.height || 1
      });
    };

    img.onerror = function () {
      resolve(null);
    };

    img.src = ruta;
  });
}

function cargarArchivoBase64(ruta) {
  return fetch(ruta)
    .then((respuesta) => {
      if (!respuesta.ok) return null;
      return respuesta.arrayBuffer();
    })
    .then((buffer) => {
      if (!buffer) return null;

      let binario = "";
      const bytes = new Uint8Array(buffer);

      for (let i = 0; i < bytes.byteLength; i++) {
        binario += String.fromCharCode(bytes[i]);
      }

      return btoa(binario);
    })
    .catch(() => null);
}
