function actualizarAdministrador(){
    console.log("entro funcion actualizar");
    document.forms['actualizarEliminadAdmin'].action = '/actualizarAdmin'; 
    document.forms['actualizarEliminadAdmin'].submit();
}

function eliminarAdministrador() {
    console.log("entro funcion eliminar");
        if (result.isConfirmed) {
            document.forms['actualizarEliminadAdmin'].action = '/eliminarCuentaAdmin'; 
            document.forms['actualizarEliminadAdmin'].submit();
        }
}

function eliminarUsuario(){
    console.log("entro funcion eliminar");
    document.forms['actualizarEliminarUsuario'].action = '/eliminarCuentaUsuario'; 
    document.forms['actualizarEliminarUsuario'].submit();
  
}

function actualizarUsuario(){
    console.log("entro funcion eliminar");
    document.forms['actualizarEliminarUsuario'].action = '/actualizarUsuario'; 
    document.forms['actualizarEliminarUsuario'].submit();
  
}

function registroUsuario(){
    console.log("entro funcion registrar");
    document.forms['registrarUsuario'].action = '/registrar'; 
    document.forms['registrarUsuario'].submit();
}

function registroComentario(){
    console.log("entro funcion registrar");
    document.forms['enviarComentarioUsuario'].action = '/rutaComentarios'; 
    document.forms['enviarComentarioUsuario'].submit();
}

function solicitarCambio(){
    console.log("entro funcion solicitud");
    document.forms['enviarSolicitud'].action = '/recuperar'; 
    document.forms['enviarSolicitud'].submit();
}

function cambioContrasena(){
    console.log("entro funcion cambio");
    document.forms['resetForm'].action = '/resets'; 
    document.forms['resetForm'].submit();
}

function eliminarUsuarioPanelAdmin(idUsuario) {
    fetch('/eliminarCuentaUsuarioPanel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idUsuario: idUsuario }),
    })
    .then(response => response.text())
    .then(data => {
        console.log(data);
        $('#users').DataTable().ajax.reload();
    })
}

function eliminarEventoPanelUsuario(Id_Evento) {
    fetch('/eliminarEventoUsuarios', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ Id_Evento: Id_Evento }),
    })
    .then(response => response.text())
    .then(data => {
        console.log(data);
        $('#users').DataTable().ajax.reload();
    })
}

function eliminarComentarioPanelUsuario(id_comentarios) {
    fetch('/eliminarComentarioUsuarios', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_comentarios: id_comentarios }),
    })
    .then(response => response.text())
    .then(data => {
        console.log(data);
        $('#users').DataTable().ajax.reload();
    })
}

function eliminarComentarioPanelAdmin(id_comentarios) {
    fetch('/eliminarComentarioUsuarios', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_comentarios: id_comentarios }),
    })
    .then(response => response.text())
    .then(data => {
        console.log(data);
        $('#users').DataTable().ajax.reload();
    })
}

