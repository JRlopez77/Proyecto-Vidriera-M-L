document.addEventListener("DOMContentLoaded", () => {
  colocarFechaActual();
  asignarEventosIVA();
  asignarEventosAdelanto();
  asignarEventosDocumento();
  inicializarHistorial();
  inicializarNavegacion();
  inicializarPersistenciaFormulario();

  if (!restaurarBorrador()) {
    generarNumeroCotizacion();
    agregarFila();
  }
});

const CLAVE_HISTORIAL = "historialCotizacionesV1";
const CLAVE_BORRADOR = "borradorCotizacionV1";
const COTIZACIONES_POR_PAGINA = 5;
let cotizacionEnEdicionId = null;
let paginaHistorialActual = 1;
let temporizadorGuardado = null;
let restaurandoFormulario = false;

function leerAlmacenamiento(clave, valorPredeterminado = null) {
  try {
    const valor = localStorage.getItem(clave);
    return valor === null ? valorPredeterminado : valor;
  } catch (error) {
    console.error("No se pudo leer el almacenamiento local.", error);
    return valorPredeterminado;
  }
}

function escribirAlmacenamiento(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
    return true;
  } catch (error) {
    console.error("No se pudo guardar en el almacenamiento local.", error);
    return false;
  }
}

function eliminarDelAlmacenamiento(clave) {
  try {
    localStorage.removeItem(clave);
  } catch (error) {
    console.error("No se pudo limpiar el almacenamiento local.", error);
  }
}

function colocarFechaActual() {
  const fecha = document.getElementById("fecha");
  const hoy = new Date().toISOString().split("T")[0];
  fecha.value = hoy;
}

function generarNumeroCotizacion() {
  let contador = parseInt(leerAlmacenamiento("contadorCotizacion", "0"), 10) || 0;
  contador++;

  escribirAlmacenamiento("contadorCotizacion", String(contador));

  const numero = `COT-${String(contador).padStart(6, "0")}`;
  document.getElementById("numeroCotizacion").value = numero;
}

function crearOpcionesVentanas() {
  return TIPOS_VENTANA.map((tipo) => {
    return `<option value="${tipo.id}">${tipo.nombre}</option>`;
  }).join("");
}

function obtenerVentanaPorId(id) {
  return TIPOS_VENTANA.find((tipo) => tipo.id === id) || TIPOS_VENTANA[0];
}

function agregarFila(datosFila = null) {
  const tbody = document.getElementById("detalleCotizacion");
  const fila = document.createElement("tr");

  fila.innerHTML = `
    <td data-label="Tipo">
      <img class="imagenVentana" src="${TIPOS_VENTANA[0].imagen}" alt="Producto">
      <select class="tipoVentana">
        ${crearOpcionesVentanas()}
      </select>
      <input type="text" class="tipo-personalizado" placeholder="Especificar tipo" hidden>
    </td>

    <td data-label="Medidas">
      <div class="campo-medidas">
        <input type="text" class="medidas" placeholder="Ej: 120 x 100 cm">
        <label class="opcion-sin-medidas">
          <input type="checkbox" class="sinMedidas">
          <span>Sin medidas</span>
        </label>
      </div>
    </td>

    <td data-label="Unidad">
      <select class="unidad">
        <option value="UND">UND</option>
        <option value="M2">M2</option>
        <option value="ML">ML</option>
      </select>
    </td>

    <td data-label="Cantidad">
      <input type="number" class="cantidad" value="1" min="1">
    </td>

    <td data-label="Precio">
      <input type="number" class="precio" value="0" min="0">
    </td>

    <td data-label="Color aluminio">
      <select class="colorAluminio">
        <option value="Negro">Negro</option>
        <option value="Blanco">Blanco</option>
        <option value="Bronce">Bronce</option>
        <option value="Natural">Natural</option>
        <option value="Madera">Madera</option>
        <option value="Inox">Inox</option>
        <option value="Champagne">Champagne</option>
      </select>
    </td>

    <td data-label="Color vidrio">
      <input type="text" class="color-vidrio" aria-label="Color vidrio">
    </td>

    <td data-label="Descripcion">
      <input type="text" class="descripcion" placeholder="Descripcion adicional">
    </td>

    <td class="totalFila" data-label="Total">₡0.00</td>

    <td data-label="Accion">
      <button class="btn-eliminar" onclick="eliminarFila(this)" aria-label="Eliminar producto">X</button>
    </td>
  `;

  tbody.appendChild(fila);
  asignarEventosFila(fila);
  if (datosFila) cargarDatosFila(fila, datosFila);
  calcularTotales();
  fila.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function cargarDatosFila(fila, datos) {
  const tipoId = TIPOS_VENTANA.some((tipo) => tipo.id === datos.tipoId) ? datos.tipoId : "otro";
  fila.querySelector(".tipoVentana").value = tipoId;
  fila.querySelector(".tipo-personalizado").value = datos.tipoPersonalizado || "";
  fila.querySelector(".tipo-personalizado").hidden = tipoId !== "otro";
  fila.querySelector(".imagenVentana").src = obtenerVentanaPorId(tipoId).imagen;
  fila.querySelector(".medidas").value = datos.medidas || "";
  fila.querySelector(".sinMedidas").checked = Boolean(datos.sinMedidas);
  fila.querySelector(".medidas").disabled = Boolean(datos.sinMedidas);
  fila.querySelector(".unidad").value = datos.unidad || "UND";
  fila.querySelector(".cantidad").value = datos.cantidad || 1;
  fila.querySelector(".precio").value = datos.precio || 0;
  fila.querySelector(".colorAluminio").value = datos.colorAluminio || "Negro";
  fila.querySelector(".color-vidrio").value = datos.colorVidrio || "";
  fila.querySelector(".descripcion").value = datos.descripcion || "";
}

function asignarEventosFila(fila) {
  fila.querySelector(".tipoVentana").addEventListener("change", () => {
    const id = fila.querySelector(".tipoVentana").value;
    const ventana = obtenerVentanaPorId(id);
    const tipoPersonalizado = fila.querySelector(".tipo-personalizado");

    fila.querySelector(".imagenVentana").src = ventana.imagen;
    tipoPersonalizado.hidden = id !== "otro";

    if (id === "otro") {
      tipoPersonalizado.focus();
    } else {
      tipoPersonalizado.value = "";
    }
  });

  fila.querySelector(".sinMedidas").addEventListener("change", (evento) => {
    const medidas = fila.querySelector(".medidas");
    medidas.disabled = evento.target.checked;

    if (evento.target.checked) {
      medidas.value = "";
    }
  });

  fila.querySelector(".cantidad").addEventListener("input", calcularTotales);
  fila.querySelector(".precio").addEventListener("input", calcularTotales);
}

function inicializarPersistenciaFormulario() {
  const cotizador = document.getElementById("vistaCotizador");
  const programarGuardado = () => {
    if (restaurandoFormulario) return;
    clearTimeout(temporizadorGuardado);
    temporizadorGuardado = setTimeout(guardarBorrador, 250);
  };

  cotizador.addEventListener("input", programarGuardado);
  cotizador.addEventListener("change", programarGuardado);
  window.addEventListener("beforeunload", guardarBorrador);
  window.addEventListener("storage", (evento) => {
    if (evento.key === CLAVE_HISTORIAL) renderizarHistorial();
  });
}

function guardarBorrador() {
  if (restaurandoFormulario || !document.querySelector("#detalleCotizacion tr")) return;
  const borrador = {
    ...obtenerDatosFormulario(),
    idEnEdicion: cotizacionEnEdicionId,
    guardadoEn: new Date().toISOString()
  };
  escribirAlmacenamiento(CLAVE_BORRADOR, JSON.stringify(borrador));
}

function restaurarBorrador() {
  let borrador;
  try {
    borrador = JSON.parse(leerAlmacenamiento(CLAVE_BORRADOR, "null"));
  } catch (error) {
    eliminarDelAlmacenamiento(CLAVE_BORRADOR);
    return false;
  }

  if (!borrador || !Array.isArray(borrador.productos)) return false;
  restaurandoFormulario = true;
  cargarCotizacionEnFormulario(borrador, borrador.idEnEdicion || null);
  restaurandoFormulario = false;
  return true;
}

function asignarEventosIVA() {
  document.querySelectorAll('input[name="opcionIVA"]').forEach((opcion) => {
    opcion.addEventListener("change", calcularTotales);
  });
}

function asignarEventosAdelanto() {
  const porcentajeAdelanto = document.getElementById("porcentajeAdelanto");

  if (porcentajeAdelanto) {
    porcentajeAdelanto.addEventListener("input", calcularTotales);
  }
}

function asignarEventosDocumento() {
  document.querySelectorAll('input[name="tipoDocumento"]').forEach((opcion) => {
    opcion.addEventListener("change", actualizarTipoDocumento);
  });

  actualizarTipoDocumento();
}

function actualizarTipoDocumento() {
  const datosFactura = document.getElementById("datosFactura");

  if (!datosFactura) return;

  datosFactura.classList.toggle("visible", tipoDocumentoActual() === "factura");
}

function tipoDocumentoActual() {
  const opcion = document.querySelector('input[name="tipoDocumento"]:checked');
  return opcion ? opcion.value : "cotizacion";
}

function eliminarFila(boton) {
  const fila = boton.closest("tr");
  fila.remove();
  calcularTotales();
}

function limpiarCotizacion() {
  const confirmar = confirm("Deseas borrar la cotizacion y reiniciar el contador a cero?");

  if (!confirmar) return;

  escribirAlmacenamiento("contadorCotizacion", "0");
  eliminarDelAlmacenamiento(CLAVE_BORRADOR);

  document.getElementById("cliente").value = "";
  document.getElementById("telefono").value = "";
  document.getElementById("correo").value = "";
  document.getElementById("proyecto").value = "";
  document.getElementById("observaciones").value = "";
  document.getElementById("plazoEntrega").value = "8";
  document.getElementById("numeroFactura").value = "";
  document.getElementById("identificacionFactura").value = "";
  document.getElementById("metodoPago").value = "";
  document.getElementById("direccionFactura").value = "";
  document.getElementById("condicionVenta").value = "Contado";
  document.querySelector('input[name="tipoDocumento"][value="cotizacion"]').checked = true;
  document.getElementById("porcentajeAdelanto").value = "80";
  document.getElementById("detalleCotizacion").innerHTML = "";
  cotizacionEnEdicionId = null;
  actualizarBotonGuardar();

  colocarFechaActual();
  generarNumeroCotizacion();
  actualizarTipoDocumento();
  agregarFila();
}

function obtenerHistorial() {
  try {
    const historial = JSON.parse(leerAlmacenamiento(CLAVE_HISTORIAL, "[]"));
    return Array.isArray(historial) ? historial : [];
  } catch (error) {
    return [];
  }
}

function obtenerDatosFormulario() {
  return {
    numero: document.getElementById("numeroCotizacion").value,
    tipoDocumento: tipoDocumentoActual(),
    numeroFactura: document.getElementById("numeroFactura").value,
    identificacionFactura: document.getElementById("identificacionFactura").value,
    condicionVenta: document.getElementById("condicionVenta").value,
    metodoPago: document.getElementById("metodoPago").value,
    direccionFactura: document.getElementById("direccionFactura").value,
    cliente: document.getElementById("cliente").value,
    telefono: document.getElementById("telefono").value,
    correo: document.getElementById("correo").value,
    proyecto: document.getElementById("proyecto").value,
    fecha: document.getElementById("fecha").value,
    observaciones: document.getElementById("observaciones").value,
    plazoEntrega: document.getElementById("plazoEntrega").value,
    conIVA: cotizacionConIVA(),
    porcentajeAdelanto: document.getElementById("porcentajeAdelanto").value,
    productos: Array.from(document.querySelectorAll("#detalleCotizacion tr")).map((fila) => ({
      tipoId: fila.querySelector(".tipoVentana").value,
      tipoPersonalizado: fila.querySelector(".tipo-personalizado").value,
      medidas: fila.querySelector(".medidas").value,
      sinMedidas: fila.querySelector(".sinMedidas").checked,
      unidad: fila.querySelector(".unidad").value,
      cantidad: obtenerNumero(fila.querySelector(".cantidad").value),
      precio: obtenerNumero(fila.querySelector(".precio").value),
      colorAluminio: fila.querySelector(".colorAluminio").value,
      colorVidrio: fila.querySelector(".color-vidrio").value,
      descripcion: fila.querySelector(".descripcion").value
    })),
    total: obtenerTotalesNumericos().total
  };
}

function guardarCotizacion(mostrarMensaje = true) {
  const datos = obtenerDatosFormulario();
  if (!datos.productos.length) {
    if (mostrarMensaje) alert("Debes agregar al menos un producto.");
    return false;
  }
  const historial = obtenerHistorial();
  const ahora = new Date().toISOString();
  const indice = historial.findIndex((item) => item.id === cotizacionEnEdicionId);
  let idGuardado = cotizacionEnEdicionId;
  if (indice >= 0) {
    historial[indice] = { ...historial[indice], ...datos, actualizadoEn: ahora };
  } else {
    idGuardado = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    historial.unshift({ id: idGuardado, ...datos, creadoEn: ahora, actualizadoEn: ahora });
  }
  if (!escribirAlmacenamiento(CLAVE_HISTORIAL, JSON.stringify(historial))) {
    if (mostrarMensaje) alert("No fue posible guardar la cotizacion. Revisa que el navegador permita almacenamiento local.");
    return false;
  }
  cotizacionEnEdicionId = idGuardado;
  eliminarDelAlmacenamiento(CLAVE_BORRADOR);
  paginaHistorialActual = 1;
  actualizarBotonGuardar();
  renderizarHistorial();
  if (mostrarMensaje) alert("Cotizacion guardada correctamente.");
  return true;
}

function editarCotizacion(id) {
  const cotizacion = obtenerHistorial().find((item) => item.id === id);
  if (!cotizacion) return;
  cargarCotizacionEnFormulario(cotizacion, id);
  guardarBorrador();
  cambiarVista("cotizador");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cargarCotizacionEnFormulario(cotizacion, idEnEdicion = null) {
  cotizacionEnEdicionId = idEnEdicion;
  const campos = ["numeroFactura", "identificacionFactura", "condicionVenta", "metodoPago", "direccionFactura", "cliente", "telefono", "correo", "proyecto", "fecha", "observaciones", "plazoEntrega"];
  campos.forEach((campo) => {
    if (cotizacion[campo] !== undefined) document.getElementById(campo).value = cotizacion[campo];
  });
  document.getElementById("numeroCotizacion").value = cotizacion.numero;
  const tipoDocumento = ["cotizacion", "factura"].includes(cotizacion.tipoDocumento) ? cotizacion.tipoDocumento : "cotizacion";
  document.querySelector(`input[name="tipoDocumento"][value="${tipoDocumento}"]`).checked = true;
  document.querySelector(`input[name="opcionIVA"][value="${cotizacion.conIVA === false ? "sin" : "con"}"]`).checked = true;
  document.getElementById("porcentajeAdelanto").value = cotizacion.porcentajeAdelanto || 80;
  document.getElementById("detalleCotizacion").innerHTML = "";
  (cotizacion.productos || []).forEach((producto) => agregarFila(producto));
  if (!cotizacion.productos || !cotizacion.productos.length) agregarFila();
  actualizarTipoDocumento();
  actualizarBotonGuardar();
  calcularTotales();
}

function eliminarCotizacionHistorial(id) {
  const cotizacion = obtenerHistorial().find((item) => item.id === id);
  if (!cotizacion || !confirm(`Deseas eliminar la cotizacion ${cotizacion.numero}?`)) return;
  if (!escribirAlmacenamiento(CLAVE_HISTORIAL, JSON.stringify(obtenerHistorial().filter((item) => item.id !== id)))) {
    alert("No fue posible eliminar la cotizacion del historial.");
    return;
  }
  if (cotizacionEnEdicionId === id) {
    cotizacionEnEdicionId = null;
    actualizarBotonGuardar();
  }
  renderizarHistorial();
}

function inicializarHistorial() {
  document.getElementById("buscarCotizacion").addEventListener("input", () => {
    paginaHistorialActual = 1;
    renderizarHistorial();
  });
  document.getElementById("paginaAnterior").addEventListener("click", () => cambiarPaginaHistorial(-1));
  document.getElementById("paginaSiguiente").addEventListener("click", () => cambiarPaginaHistorial(1));
  renderizarHistorial();
}

function inicializarNavegacion() {
  document.getElementById("navCotizador").addEventListener("click", () => cambiarVista("cotizador"));
  document.getElementById("navHistorial").addEventListener("click", () => cambiarVista("historial"));
}

function cambiarVista(vista) {
  const mostrarHistorial = vista === "historial";
  document.getElementById("vistaCotizador").hidden = mostrarHistorial;
  document.getElementById("vistaHistorial").hidden = !mostrarHistorial;

  const botonCotizador = document.getElementById("navCotizador");
  const botonHistorial = document.getElementById("navHistorial");
  botonCotizador.classList.toggle("activo", !mostrarHistorial);
  botonHistorial.classList.toggle("activo", mostrarHistorial);
  botonCotizador.toggleAttribute("aria-current", !mostrarHistorial);
  botonHistorial.toggleAttribute("aria-current", mostrarHistorial);

  if (mostrarHistorial) renderizarHistorial();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cambiarPaginaHistorial(desplazamiento) {
  paginaHistorialActual += desplazamiento;
  renderizarHistorial();
  document.querySelector(".historial-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function escaparHTML(texto) {
  const elemento = document.createElement("div");
  elemento.textContent = texto == null ? "" : String(texto);
  return elemento.innerHTML;
}

function renderizarHistorial() {
  const contenedor = document.getElementById("historialCotizaciones");
  const paginacion = document.getElementById("paginacionHistorial");
  const termino = document.getElementById("buscarCotizacion").value.trim().toLowerCase();
  const historial = obtenerHistorial().filter((item) => [item.numero, item.cliente, item.proyecto].some((valor) => String(valor || "").toLowerCase().includes(termino)));
  if (!historial.length) {
    contenedor.innerHTML = `<p class="historial-vacio">${termino ? "No hay resultados para la busqueda." : "Todavia no hay cotizaciones guardadas."}</p>`;
    paginacion.hidden = true;
    paginaHistorialActual = 1;
    return;
  }

  const totalPaginas = Math.ceil(historial.length / COTIZACIONES_POR_PAGINA);
  paginaHistorialActual = Math.min(Math.max(paginaHistorialActual, 1), totalPaginas);
  const inicio = (paginaHistorialActual - 1) * COTIZACIONES_POR_PAGINA;
  const fin = Math.min(inicio + COTIZACIONES_POR_PAGINA, historial.length);
  const cotizacionesVisibles = historial.slice(inicio, fin);

  contenedor.innerHTML = cotizacionesVisibles.map((item) => `
    <article class="historial-item">
      <div><strong>${escaparHTML(item.numero)}</strong><br><small>${escaparHTML(item.fecha || "Sin fecha")}</small></div>
      <div><strong>${escaparHTML(item.cliente || "Sin cliente")}</strong><br><small>${escaparHTML(item.proyecto || "Sin proyecto")}</small></div>
      <div>${(item.productos || []).length} producto(s)</div>
      <div><strong>${formatoMoneda(item.total)}</strong></div>
      <div class="historial-acciones">
        <button class="btn btn-editar" onclick="editarCotizacion('${item.id}')">Editar</button>
        <button class="btn secundario" onclick="eliminarCotizacionHistorial('${item.id}')">Eliminar</button>
      </div>
    </article>`).join("");

  paginacion.hidden = totalPaginas <= 1;
  document.getElementById("paginaAnterior").disabled = paginaHistorialActual === 1;
  document.getElementById("paginaSiguiente").disabled = paginaHistorialActual === totalPaginas;
  document.getElementById("estadoPaginacion").textContent = `${inicio + 1}-${fin} de ${historial.length} | Pagina ${paginaHistorialActual} de ${totalPaginas}`;
}

function actualizarBotonGuardar() {
  document.getElementById("btnGuardarCotizacion").textContent = cotizacionEnEdicionId ? "Guardar cambios" : "Guardar cotizacion";
}
