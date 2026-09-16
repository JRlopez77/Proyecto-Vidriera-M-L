function formatoMoneda(valor) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor || 0);
}

function obtenerNumero(valor) {
  return parseFloat(valor) || 0;
}

function cotizacionConIVA() {
  const opcion = document.querySelector('input[name="opcionIVA"]:checked');
  return !opcion || opcion.value === "con";
}

function obtenerPorcentajeAdelanto() {
  const control = document.getElementById("porcentajeAdelanto");
  return control ? obtenerNumero(control.value) : 80;
}

function calcularTotales() {
  let ventaNeta = 0;

  const filas = document.querySelectorAll("#detalleCotizacion tr");

  filas.forEach((fila) => {
    const cantidad = obtenerNumero(fila.querySelector(".cantidad").value);
    const precio = obtenerNumero(fila.querySelector(".precio").value);

    const total = cantidad * precio;

    fila.querySelector(".totalFila").textContent = formatoMoneda(total);
    fila.dataset.total = total;

    ventaNeta += total;
  });

  const iva = cotizacionConIVA() ? ventaNeta * IVA_PORCENTAJE : 0;
  const totalGeneral = ventaNeta + iva;
  const porcentajeAdelanto = obtenerPorcentajeAdelanto();
  const montoAdelanto = totalGeneral * (porcentajeAdelanto / 100);
  const montoRestante = totalGeneral - montoAdelanto;

  document.getElementById("ventaNeta").textContent = formatoMoneda(ventaNeta);
  document.getElementById("iva").textContent = formatoMoneda(iva);
  document.getElementById("totalGeneral").textContent = formatoMoneda(totalGeneral);

  document.getElementById("valorPorcentajeAdelanto").textContent = `${porcentajeAdelanto}%`;
  document.getElementById("montoAdelanto").textContent = formatoMoneda(montoAdelanto);
  document.getElementById("montoRestante").textContent = formatoMoneda(montoRestante);

  const etiquetaIVA = document.getElementById("etiquetaIVA");
  if (etiquetaIVA) {
    etiquetaIVA.textContent = cotizacionConIVA() ? "IVA 13%:" : "IVA:";
  }
}
