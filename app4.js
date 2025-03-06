const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const path = require('path');
const { body, validationResult } = require('express-validator');
const mysql = require("mysql2");
var cors = require('cors');
const crypto = require('crypto');
const { sendEmail } = require('./mail');

// Configurar cabeceras y cors
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
    next();
});

// Configuración de la conexión a la base de datos
let conexion = mysql.createConnection({
    host: "127.0.0.1",
    database: "copia_db_shorty",
    user: "root",
    password: "PalomaH1"
});

// Verificar conexión a la base de datos
conexion.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database.');
});

// Configurar sesiones
app.use(session({
    secret: '23292013',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Ruta de archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configurar EJS como el motor de plantillas
app.use(express.json());
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

// Ruta para el formulario

app.get('/login', (req, res) => {
    const userCorreo = req.session.userCorreo;
    if (!userCorreo) {
        return res.render('sesion');
    }

    conexion.query('SELECT id_usuarios FROM usuarios WHERE correo = ?', [userCorreo], (error, results) => {
        if (error) {
            console.error('Error obteniendo la información del usuario:', error);
            return res.status(500).send('Error al obtener la información del usuario');
        }
        if (results.length > 0) {
            const usuario = results[0];
            req.session.idUsuario = usuario.id_usuarios;
            res.render('sesion', {
                id_usuarios: usuario.id_usuarios,
            });
        }
    });
});

app.get('/registrar', (req, res) => {
    res.render('Registro', { valores: {}, validaciones: [], success: true });
});

app.get('/resets', (req,res) => {
    res.render('resetpassword');
});

app.get('/indexEventosUsr', (req,res)=>{
    res.render('indexTablasEventosUsur');
});

app.get('/indexComentarios', (req,res)=>{
    res.render('indexTablasComentariosAdmin');
});

app.get('/indexComentariosUsr',(req,res)=>{
    res.render('indexTablasComentariosUsur');
});

app.get('/recuperar', (req, res) => {
    res.render('Recuperacion');
});

app.get('/indexCalificaciones',(req,res)=>{
    res.render('IndexTablaCalificacion');
});


app.get('/api/comentariosUsuario/:id', (req, res) => {
    const userCorreo = req.session.userCorreo;
    if (!userCorreo) {
        return res.redirect('/login');
    }

    conexion.query('SELECT id_usuarios FROM usuarios WHERE correo = ?', [userCorreo], (error, results) => {
        if (error) {
            console.error('Error obteniendo la información del usuario:', error);
            return res.status(500).send('Error al obtener la información del usuario');
        }

        if (results.length > 0) {
            const usuario = results[0];
            const idUsuario = usuario.id_usuarios;

            // Consulta para obtener los eventos del usuario
            conexion.query('SELECT id_comentarios,text_comentario FROM comentarios WHERE id_usuarios = ?', [idUsuario], (error, comentarios) => {
                if (error) {
                    console.error('Error obteniendo los eventos del usuario:', error);
                    return res.status(500).send('Error al obtener los eventos del usuario');
                }

                // Responder con los eventos del usuario y el ID del usuario
                res.json({
                    comentarios: comentarios,
                    idUsuario: idUsuario
                });
            });
        } else {
            // No se encontraron usuarios con el correo proporcionado
            res.status(404).send('Usuario no encontrado');
        }
    });
});


  // Ruta para verificar si el usuario ya ha calificado
app.get('/check-rating', (req, res) => {
    const idUsuario = req.session.idUsuario;
    if (!idUsuario) {
      return res.status(400).json({ hasRated: false });
    }
  
    // Verificar si el usuario ya ha calificado
    const sql = 'SELECT COUNT(*) AS count FROM estrellitas WHERE id_usuarios = ?';
    conexion.query(sql, [idUsuario], (error, results) => {
      if (error) {
        console.error('Error al verificar la calificación:', error);
        return res.status(500).json({ hasRated: false });
      }
      res.json({ hasRated: results[0].count > 0 });
    });
});

app.get('/get-user-rating', (req, res) => {
    const userId = req.session.idUsuario;

    if (!userId) {
        return res.json({ success: false, message: 'No se encontró el usuario' });
    }

    conexion.query('SELECT rating FROM estrellitas WHERE id_usuarios = ?', [userId], (error, results) => {
        if (error) {
            console.error('Error al obtener la calificación:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener la calificación' });
        }

        const rating = results.length > 0 ? results[0].rating : null;
        res.json({ success: true, rating });
    });
});

app.get('/get-average-rating', (req, res) => {
    const sql = 'SELECT AVG(rating) AS average FROM estrellitas';
    conexion.query(sql, (error, results) => {
      if (error) {
        console.error('Error al obtener el promedio de calificaciones:', error);
        return res.status(500).json({ success: false });
      }
      const average = results[0].average || 0;
      res.json({ average });
    });
});  

app.get('/recuperar', (req, res) => {
    const { token } = req.params;
    conexion.query('SELECT * FROM password_resets WHERE token = ? AND expires > ?', [token, Date.now()], (error, results) => {
        if (error) {
            console.error('Error verificando el token:', error);
            return res.status(500).send('Error al verificar el token');
        }

        if (results.length > 0) {
            res.json({ token: token });
        } else {
            res.status(400).send('Token inválido o expirado');
        }
    });
});

app.get('/api/users', (req, res) => {
    conexion.query('SELECT * FROM usuarios', (error, filas) => {
        if (error) {
            console.error('Error durante la consulta de usuarios:', error);
            return res.status(500).send('Error durante la consulta de usuarios');
        }
        res.send(filas);
    });
});

app.get('/api/eventos', (req,res)=>{
    conexion.query('SELECT * FROM fechas_eventos', (error,filas)=>{
        if(error){
            throw error;
        }else{
            res.send(filas);
        }
    })
});

app.get('/api/comentariosPanelAdmin', (req,res)=>{
    conexion.query('SELECT * FROM comentarios_usuarios', (error,filas)=>{
        if(error){
            throw error;
        }else{
            res.send(filas);
        }
    })
});

app.get('/api/calificacionesPanelAdmin', (req, res)=>{
    conexion.query('SELECT * FROM calificaciones_usuarios',(error,filas)=>{
        if(error){
            throw error;
        }else{
            res.send(filas);
        }        
    })
});

app.get('/api/eventosUsuario', (req, res) => {
    const userCorreo = req.session.userCorreo;
    if (!userCorreo) {
        return res.redirect('/login');
    }

    conexion.query('SELECT id_usuarios FROM usuarios WHERE correo = ?', [userCorreo], (error, results) => {
        if (error) {
            console.error('Error obteniendo la información del usuario:', error);
            return res.status(500).send('Error al obtener la información del usuario');
        }

        if (results.length > 0) {
            const usuario = results[0];
            const idUsuario = usuario.id_usuarios;

            // Consulta para obtener los eventos del usuario
            conexion.query(`
                SELECT 
                    d.id_eventos AS Id_Evento,
                    d.lugar_evento AS Lugar_Evento, 
                    d.fecha_evento AS Fecha_Evento, 
                    d.hora_inicio AS Hora_Inicio, 
                    d.hora_final AS Hora_Final, 
                    f.nombrePaquete AS NombrePaquete,
                    f.precio AS Precio,
                    a.fecha AS Fecha_Cita_Contrato,
                    a.hora AS Hora_Cita_Contrato
                FROM 
                    eventos d
                INNER JOIN 
                    paquetes f ON d.id_paquetes = f.id_paquetes
                INNER JOIN 
                    citas a ON d.id_usuarios = a.id_usuarios
                WHERE 
                    d.id_usuarios = ?
            `, [idUsuario], (error, eventos) => {
                if (error) {
                    console.error('Error obteniendo los eventos del usuario:', error);
                    return res.status(500).send('Error al obtener los eventos del usuario');
                }
                res.json({
                    eventos: eventos,
                    idUsuario: idUsuario
                });
            });
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    });
});

app.get('/api/comentariosUsuario', (req, res) => {
    const userCorreo = req.session.userCorreo;
    if (!userCorreo) {
        return res.redirect('/login');
    }

    conexion.query('SELECT id_usuarios FROM usuarios WHERE correo = ?', [userCorreo], (error, results) => {
        if (error) {
            console.error('Error obteniendo la información del usuario:', error);
            return res.status(500).send('Error al obtener la información del usuario');
        }

        if (results.length > 0) {
            const usuario = results[0];
            const idUsuario = usuario.id_usuarios;

            // Consulta para obtener los eventos del usuario
            conexion.query('SELECT id_comentarios,text_comentario FROM comentarios WHERE id_usuarios = ?', [idUsuario], (error, comentarios) => {
                if (error) {
                    console.error('Error obteniendo los eventos del usuario:', error);
                    return res.status(500).send('Error al obtener los eventos del usuario');
                }

                res.json({
                    comentarios: comentarios,
                    idUsuario: idUsuario
                });
            });
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    });
});


app.get('/usuarioedit', (req, res) => {
    const userCorreo = req.session.userCorreo;
    if (!userCorreo) {
        return res.redirect('/login');
    }

    conexion.query('SELECT nombre, apellidos,fechanacimiento,edad,correo,num_tel,contrasena,id_usuarios FROM usuarios WHERE correo = ?', [userCorreo], (error, results) => {
        if (error) {
            console.error('Error obteniendo la información del usuario:', error);
            return res.status(500).send('Error al obtener la información del usuario');
        }

        if (results.length > 0) {
            const usuario = results[0];
            req.session.idUsuario = usuario.id_usuarios;
            res.render('adminusuario', {
                nombre: usuario.nombre,
                apellidos: usuario.apellidos,
                fechanacimiento: usuario.fechanacimiento,
                edad: usuario.edad,
                correo: usuario.correo,
                num_tel: usuario.num_tel,
                contrasena: usuario.contrasena,
            });
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    });
});

app.get('/citas', (req, res) => {
    res.render('interfazcitas');
});

app.get('/citafirmadecontrato', (req, res) => {
    res.render('interfazcitafirma');
});

app.get('/inicioexitoso', (req, res) => {
    res.render('pantallaur');
});

app.get('/indexEventos', (req,res) => {
    res.render('indexTablasEventos');
});

app.get('/enviarcalificacion', (req, res)=>{
    const userCorreo = req.session.userCorreo;
    if (!userCorreo) {
        return res.redirect('/login');
    }
    conexion.query('SELECT id_usuarios FROM usuarios WHERE correo = ?', [userCorreo], (error, results) => {
        if (error) {
            console.error('Error obteniendo la información del usuario:', error);
            return res.status(500).send('Error al obtener la información del usuario');
        }
        if (results.length > 0) {
            const usuario = results[0];
            req.session.idUsuario = usuario.id_usuarios;
            res.render('enviarcalificacion',{
                idUsuario: usuario.id_usuarios
            });
        }
    })
});

app.get('/indexadmin', (req, res) => {
    const userCorreo = req.session.userCorreo;
    if (!userCorreo) {
        return res.redirect('/login');
    }

    conexion.query('SELECT nombre, apellidos, fechanacimiento, correo, num_tel FROM usuarios WHERE correo = ?', [userCorreo], (error, results) => {
        if (error) {
            console.error('Error obteniendo la información del usuario:', error);
            return res.status(500).send('Error al obtener la información del usuario');
        }

        if (results.length > 0) {
            const usuario = results[0];
            req.session.idUsuario = usuario.id_usuarios;
            res.render('indexTablas', {
                nombre: usuario.nombre,
                apellidos: usuario.apellidos,
                fechanacimiento: usuario.fechanacimiento,
                correo: usuario.correo,
                num_tel: usuario.num_tel,
            });
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    });
});

app.get('/logout',(req,res)=>{
    res.render('index');
});
app.get('/indexconfig', (req, res) => {
    const userCorreo = req.session.userCorreo;
    if (!userCorreo) {
        return res.redirect('/login');
    }

    conexion.query('SELECT nombre, apellidos,fechanacimiento,edad,correo,num_tel,contrasena, id_usuarios FROM usuarios WHERE correo = ?', [userCorreo], (error, results) => {
        if (error) {
            console.error('Error obteniendo la información del usuario:', error);
            return res.status(500).send('Error al obtener la información del usuario');
        }

        if (results.length > 0) {
            const usuario = results[0];
            req.session.idUsuario = usuario.id_usuarios;
            res.render('indexconfi', {
                nombre: usuario.nombre,
                apellidos: usuario.apellidos,
                fechanacimiento: usuario.fechanacimiento,
                edad: usuario.edad,
                correo: usuario.correo,
                num_tel: usuario.num_tel,
                contrasena: usuario.contrasena,
            });
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    });
});

app.get('/indexperfils', (req, res) => {
    const userCorreo = req.session.userCorreo;
    if (!userCorreo) {
        return res.redirect('/login');
    }

    conexion.query('SELECT nombre, apellidos, fechanacimiento, correo, num_tel FROM usuarios WHERE correo = ?', [userCorreo], (error, results) => {
        if (error) {
            console.error('Error obteniendo la información del usuario:', error);
            return res.status(500).send('Error al obtener la información del usuario');
        }

        if (results.length > 0) {
            const usuario = results[0];
            res.render('indexPerfil', {
                nombre: usuario.nombre,
                apellidos: usuario.apellidos,
                fechanacimiento: usuario.fechanacimiento,
                correo: usuario.correo,
                num_tel: usuario.num_tel,
            });
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            res.status(500).send('Error al cerrar sesión');
        } else {
            res.redirect('/logout');
        }
    });
});

app.get('/get-price', (req, res) => {
    const nombrePaquete = req.query.nombrePaquete;

    if (!nombrePaquete) {
        return res.status(400).json({ error: 'Nombre del paquete es requerido' });
    }
    conexion.query('SELECT precio, descripcion FROM paquetes WHERE nombrePaquete = ?', [nombrePaquete], (error, results) => {
        if (error) {
            console.error('Error obteniendo el precio y la descripción:', error);
            return res.status(500).json({ error: 'Error al obtener el precio y la descripción' });
        }

        if (results.length > 0) {
            res.json({
                precio: results[0].precio,
                descripcion: results[0].descripcion
            });
        } else {
            res.json({ precio: '0', descripcion: '' });
        }
    });
});

// Ruta para registrar datos
app.post('/registrar', [
    body('username', 'Ingresa tu nombre').exists().isLength({ min: 4 }),
    body('apellido', 'Ingresa tus apellidos').exists().isLength({ min: 4 }),
    body('fechanac', 'Fecha de nacimiento').exists().isDate(),
    body('telefono', 'Ingresa tu número telefónico').exists().isLength({ min: 10 }),
    body('email', 'Ingresa tu correo electrónico').exists().isEmail(),
    body('contra', 'Crea una contraseña').exists(),
    body('confirm_password', 'Confirma tu contraseña').exists()
        .custom((value, { req }) => value === req.body.contra).withMessage('Las contraseñas no coinciden')
], (req, res) => {
    const errors = validationResult(req);
    const valores = req.body;

    if (!errors.isEmpty()) {
        const validaciones = errors.array();
        return res.json({ success: false, validaciones, valores });
    } else {
        const datos = req.body;
        let { username, apellido, fechanac, telefono, email, contra } = datos;

        // Verificar si el correo o el teléfono ya están en uso
        conexion.query('SELECT * FROM usuarios WHERE correo = ? OR num_tel = ?', [email, telefono], (error, results) => {
            if (error) {
                console.error('Error verificando duplicados:', error);
                return res.json({ success: false, message: 'Error en la verificación de duplicados' });
            }

            if (results.length > 0) {
                return res.json({ success: false, message: 'Correo y/o número de teléfono ya registrados' });
            }

            // Insertar el nuevo usuario
            let registrame = 'INSERT INTO usuarios (nombre, apellidos, fechanacimiento, correo, contrasena, num_tel) VALUES (?, ?, ?, ?, ?, ?)';
            conexion.query(registrame, [username, apellido, fechanac, email, contra, telefono], (error, results) => {
                if (error) {
                    console.error('Error al registrar el usuario:', error);
                    return res.json({ success: false, message: 'Error al registrar el usuario' });
                }

                console.log('Datos almacenados correctamente');
                return res.json({ success: true });
            });
        });
    }
});



app.post('/citas', [
    body('direccion', 'Ingresa la direccion').exists().isLength({ min: 1 }),
    body('fechaevento', 'Ingresa la fecha').exists().isDate(),
    body('horainicio', 'Ingresa la hora').exists().isLength({ min: 1 }),
    body('horafinal', 'Ingresa la hora').exists().isLength({ min: 1 }),
    body('paquete', 'Ingresa el paquete').exists()
], (req, res) => {
    const errors = validationResult(req);
    const valores = req.body;

    if (!errors.isEmpty()) {
        const validaciones = errors.array();
        res.render('interfazcitas', { validaciones, valores, success: true });
    } else {
        const datos = req.body;
        let direccion = datos.direccion;
        let fechaevento = datos.fechaevento;
        let horainicio = datos.horainicio;
        let horafinal = datos.horafinal;
        let paquete = datos.paquete;
        let userCorreo = req.session.userCorreo;
        conexion.query('SELECT id_usuarios FROM usuarios WHERE correo = ?', [userCorreo], (error, results) => {
            if (error) {
                console.error('Error obteniendo el ID del usuario:', error);
                res.status(500).send('Error al obtener el ID del usuario');
                return;
            }
            if (results.length > 0) {
                const userId = results[0].id_usuarios;
                conexion.query('SELECT id_paquetes FROM paquetes WHERE nombrePaquete = ?', [paquete], (error, results) => {
                    if (error) {
                        console.error('Error obteniendo el ID del paquete:', error);
                        res.status(500).send('Error al obtener el ID del paquete');
                        return;
                    }
                    if (results.length > 0) {
                        const paqueteId = results[0].id_paquetes;
                        const insertarEvento = 'INSERT INTO eventos (lugar_evento, fecha_evento, hora_inicio, hora_final, id_usuarios, id_paquetes) VALUES (?, ?, ?, ?, ?, ?)';
                        conexion.query(insertarEvento, [direccion, fechaevento, horainicio, horafinal, userId, paqueteId], (error) => {
                            if (error) {
                                console.error('Error al insertar datos en eventos:', error);
                                res.status(500).send('Error al insertar datos en eventos');
                            } else {
                                console.log('Evento almacenado correctamente');
                                res.redirect('/citafirmadecontrato');
                            }
                        });
                    } else {
                        console.log('Paquete no encontrado');
                    }
                });
            } else {
                console.log('Usuario no encontrado');
            }
        });
    }
});

app.post('/citafirmadecontrato', [
  body('fechafirma', 'Ingresa la fecha').exists().isDate(),
  body('horafirma', 'Ingresa la hora').exists().isLength({ min: 1 })
], (req, res) => {
  const errors = validationResult(req);
  const valores = req.body;

  if (!errors.isEmpty()) {
    const validaciones = errors.array();
    return res.render('citasfirmadecontrato', { validaciones, valores });
  }

  const datos = req.body;
  const { fechafirma, horafirma } = datos;
  const userCorreo = req.session.userCorreo;

  conexion.query('SELECT id_usuarios FROM usuarios WHERE correo = ?', [userCorreo], (error, results) => {
    if (error) {
      console.error('Error obteniendo el ID del usuario:', error);
      return res.status(500).send('Error al obtener el ID del usuario');
    }

    if (results.length > 0) {
      const userId = results[0].id_usuarios;
      const insertarCita = 'INSERT INTO citas (fecha, hora, id_usuarios) VALUES (?, ?, ?)';

      conexion.query(insertarCita, [fechafirma, horafirma, userId], (error) => {
        if (error) {
          console.error('Error al insertar datos en citas:', error);
          return res.status(500).send('Error al insertar datos en citas');
        }

        console.log('Cita almacenada correctamente');
        res.redirect('/inicioexitoso');
      });
    } else {
        console.log('Usuario no encontrado');
    }
  });
});



app.post('/login', (req, res) => {
    const { correo, contrasena } = req.body;
    console.log('Datos recibidos:', { correo, contrasena });

    // Consulta para obtener el ID del usuario
    conexion.query('SELECT id_usuarios, contrasena FROM usuarios WHERE correo = ?', [correo], (error, results) => {
        if (error) {
            console.error('Error durante el inicio de sesión:', error);
            res.status(500).send('Error durante el inicio de sesión');
            return;
        }

        console.log('Resultados de la consulta:', results);

        if (results.length > 0) {
            const user = results[0];
            console.log('Usuario encontrado:', user);

            // Verifica si la contraseña es correcta
            if (contrasena === user.contrasena) {
                req.session.userCorreo = correo;
                req.session.idUsuario = user.id_usuarios;

                // Consulta para obtener la calificación del usuario
                conexion.query('SELECT rating FROM estrellitas WHERE id_usuarios = ?', [user.id_usuarios], (ratingError, ratingResults) => {
                    if (ratingError) {
                        console.error('Error al obtener la calificación:', ratingError);
                        res.status(500).send('Error al obtener la calificación');
                        return;
                    }

                    const rating = ratingResults.length > 0 ? ratingResults[0].rating : null;
                });
                // Consulta para verificar si el usuario está en la tabla admins
                conexion.query('SELECT * FROM admins WHERE id_usuarios = ?', [user.id_usuarios], (adminError, adminResults) => {
                    if (adminError) {
                        console.error('Error durante la verificación de admin:', adminError);
                        res.status(500).send('Error durante la verificación de admin');
                        return;
                    }

                    if (adminResults.length > 0) {
                        // El usuario es un administrador
                        res.redirect('/indexadmin');
                    } else {
                        // El usuario no es un administrador
                        res.redirect('/inicioexitoso');
                    }
                });
            } else {
                res.render('sesion', { error: 'Correo electrónico o contraseña incorrectos' });
            }
        } else {
            res.render('sesion', { error: 'Correo electrónico o contraseña incorrectos' });
        }
    });
});

app.post('/actualizarAdmin', [
    body('correo').exists().isLength({max: 50}),
    body('telefono').exists().isLength({ max: 10 }),
    body('contraseña').exists().isLength({ max: 50 }),
], (req, res) => {
    const errors = validationResult(req);
    const valores = req.body;
    if (!errors.isEmpty()) {
        const validaciones = errors.array();
        res.json({ success: false, validaciones, valores });
    } else {
        const datos = req.body;
        let correo = datos.correo;
        let telefono = datos.telefono;
        let contraseña = datos.contraseña;
        let idUsuario = req.session.idUsuario;
        let actualizar = "UPDATE usuarios SET num_tel = ?, contrasena = ?, correo = ? WHERE id_usuarios = ?";
        
        conexion.query(actualizar, [telefono, contraseña,correo, idUsuario], (error, results) => {
            if (error) {
                console.error('Error actualizando datos:', error);
                return res.status(500).json({ success: false, message: 'Error al actualizar datos' });
            }
            req.session.destroy((err) => {
                if (err) {
                    console.error('Error al destruir la sesión:', err);
                    return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
                }

                res.json({ success: true });
            });
        });
    }
});

app.post('/eliminarCuentaAdmin', (req, res) => {
    let idUsuario = req.session.idUsuario;
    
    if (!idUsuario) {
        return res.status(400).send('ID de usuario no proporcionado');
    }
    
    let eliminarUsuario = "DELETE FROM usuarios WHERE id_usuarios = ?";
    
    conexion.query(eliminarUsuario, [idUsuario], (error, results) => {
        req.session.destroy((err) => {
            if (err) {
                console.log('Error cerrando la sesión:', err);
                return res.status(500).send('Error cerrando la sesión');
            }
            res.redirect('/logout');
        });
    });
});

app.post('/actualizarUsuario', [
    body('telefono', 'Ingresa tu nuevo telefono').exists().isLength({ max: 10 }),
    body('correo', 'Ingresa tu nuevo correo').exists().isLength({max: 50}),
    body('passwrd', 'Ingresa tu nueva contraseña').exists().isLength({ max: 50 }),
], (req, res) => {
    const errors = validationResult(req);
    const valores = req.body;
    if (!errors.isEmpty()) {
        const validaciones = errors.array();
        res.json({ success: false, validaciones, valores });
    } else {
        const datos = req.body;
        let telefono = datos.telefono;
        let correo = datos.correo;
        let passwrd = datos.passwrd;
        let idUsuario = req.session.idUsuario;
        let actualizar = "UPDATE usuarios SET num_tel = ?, correo = ?, contrasena = ? WHERE id_usuarios = ?";
        
        conexion.query(actualizar, [telefono,correo,passwrd, idUsuario], (error, results) => {
            if (error) {
                console.error('Error actualizando datos:', error);
                return res.status(500).json({ success: false, message: 'Error al actualizar datos' });
            }

            req.session.destroy((err) => {
                if (err) {
                    console.error('Error al destruir la sesión:', err);
                    return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
                }

                res.json({ success: true });
            });
        });
    }
});

app.post('/eliminarCuentaUsuario', (req, res) => {
    let idUsuario = req.session.idUsuario;
    
    if (!idUsuario) {
        return res.status(400).send('ID de usuario no proporcionado');
    }
    
    let eliminarUsuario = "DELETE FROM usuarios WHERE id_usuarios = ?";
    
    conexion.query(eliminarUsuario, [idUsuario], (error, results) => {
        if (error) {
            console.error('Error eliminando el usuario:', error);
            return res.status(500).send('Error al eliminar el usuario');
        }
        
        req.session.destroy((err) => {
            if (err) {
                console.log('Error cerrando la sesión:', err);
                return res.status(500).send('Error cerrando la sesión');
            }
            res.redirect('/logout');
        });
    });
});

app.post('/eliminarCuentaUsuarioPanel', (req, res) => {
    const idUsuario = req.body.idUsuario;

    if (!idUsuario) {
        return res.status(400).send('ID de usuario no proporcionado');
    }

    const eliminarUsuario = "DELETE FROM usuarios WHERE id_usuarios = ?";

    conexion.query(eliminarUsuario, [idUsuario], (error, results) => {
    });
});

app.post('/eliminarEventoUsuarioPanel', (req, res) => {
    const idUsuario = req.body.idUsuario;

    if (!idUsuario) {
        return res.status(400).send('ID de usuario no proporcionado');
    }

    const eliminarEvento = "DELETE FROM eventos WHERE id_usuarios = ?";

    conexion.query(eliminarEvento, [idUsuario], (error, results) => {
    });
});

app.post('/eliminarEventoUsuarios', (req, res) => {
    const Id_Evento = req.body.Id_Evento;

    if (!Id_Evento) {
        return res.status(400).send('ID de evento no proporcionado');
    }

    const eliminarEvento = "DELETE FROM eventos WHERE id_eventos = ?";

    conexion.query(eliminarEvento, [Id_Evento], (error, results) => {
    });
});

app.post('/eliminarComentarioUsuarios', (req, res) => {
    const id_comentarios = req.body.id_comentarios;

    if (!id_comentarios) {
        return res.status(400).send('ID de comentario no proporcionado');
    }

    const eliminarEvento = "DELETE FROM comentarios WHERE id_comentarios = ?";

    conexion.query(eliminarEvento, [id_comentarios], (error, results) => {
    });
});

app.post('/volverAdminPanel', (req, res) => {
    const idUsuario = req.body.idUsuario;

    if (!idUsuario) {
        return res.status(400).send('ID de usuario no proporcionado');
    }

    // Primero, verificar si el usuario ya es administrador
    const verificarAdmin = "SELECT * FROM admins WHERE id_usuarios = ?";
    conexion.query(verificarAdmin, [idUsuario], (error, results) => {
        if (error) {
            console.error('Error verificando usuario como administrador:', error);
            return res.status(500).send('Error al verificar administrador');
        }

        if (results.length > 0) {
            // El usuario ya es administrador
            return res.status(400).send('El usuario ya es administrador');
        }

        // Si no es administrador, realizar la conversión
        const convertirAdmin = "INSERT INTO admins(tipoAdmin,id_usuarios) VALUES (0,?)";
        conexion.query(convertirAdmin, [idUsuario], (error, results) => {
            if (error) {
                console.error('Error convirtiendo usuario a administrador:', error);
                return res.status(500).send('Error al convertir admin');
            }

            res.status(200).send('Usuario Admin Activado');
        });
    });
});

//Post para recuperar contraseña
const os = require('os');

// Función para obtener la IP del servidor
const getServerIp = () => {
    const networkInterfaces = Object.values(os.networkInterfaces())
        .flat()
        .filter((details) => details.family === 'IPv4' && !details.internal);

    return networkInterfaces.length > 0 ? networkInterfaces[0].address : 'localhost';
};

app.post('/recuperar', (req, res) => {
    const { correo } = req.body;

    conexion.query('SELECT id_usuarios FROM usuarios WHERE correo = ?', [correo], (error, results) => {
        if (error) {
            console.log('Error verificando el correo:', error);
            return res.status(500).json({ success: false, message: 'Error al verificar el correo' });
        }

        if (results.length > 0) {
            const userId = results[0].id_usuarios;
            const token = crypto.randomBytes(20).toString('hex');
            const expires = Date.now() + 14400000;

            // Guarda el token en la base de datos con una fecha de expiración
            conexion.query(
                'INSERT INTO password_resets (id_usuarios, token, expires) VALUES (?, ?, ?)',
                [userId, token, expires],
                (err) => {
                    if (err) {
                        console.log('Error al guardar el token:', err);
                        return res.status(500).json({ success: false, message: 'Error al generar el token' });
                    }

                    // Obtén la IP del servidor
                    const ipAddress = getServerIp();
                    const resetLink = `http://${ipAddress}:3000/resets?token=${token}`;

                    // Envía el correo con el enlace de recuperación
                    sendEmail(
                        correo,
                        'Recuperación de Contraseña',
                        `Haz clic en el siguiente enlace para recuperar tu contraseña: ${resetLink}`
                    )
                        .then(() => {
                            res.json({
                                success: true,
                                message: 'Enlace de recuperación enviado a tu correo electrónico.',
                            });
                        })
                        .catch((err) => {
                            console.log('Error enviando el correo:', err);
                            res.status(500).json({ success: false, message: 'Error al enviar el correo' });
                        });
                }
            );
        } else {
            res.status(404).json({ success: false, message: 'Correo electrónico no encontrado' });
        }
    });
});


app.post('/resets', (req, res) => {
    const { token, contrasena } = req.body;

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    console.log('Fecha actual en formato SQL:', formattedDate);

    conexion.query('SELECT * FROM password_resets WHERE token = ? AND expires > ?', [token, formattedDate], (error, results) => {
        if (error) {
            console.log('Error verificando el token:', error);
            return res.status(500).send('Error al verificar el token');
        }

        if (results.length > 0) {
            const userId = results[0].id_usuarios;

            // Actualiza la contraseña en la base de datos
            conexion.query('UPDATE usuarios SET contrasena = ? WHERE id_usuarios = ?', [contrasena, userId], (err) => {
                if (err) {
                    console.log('Error actualizando la contraseña:', err);
                    return res.status(500).send('Error al actualizar la contraseña');
                }

                // Elimina el token después de usarlo
                conexion.query('DELETE FROM password_resets WHERE token = ?', [token], (deleteErr) => {
                    if (deleteErr) {
                        console.log('Error al eliminar el token:', deleteErr);
                        return res.status(500).send('Error al eliminar el token');
                    }

                    res.send('Contraseña cambiada con éxito');
                });
            });
        } else {
            console.log('Token inválido o expirado');
        }
    });
});

app.post('/enviarcalificacion', (req, res) => {
    const { rating } = req.body;
    const idUsuario = req.session.idUsuario;
    if (!rating || !idUsuario) {
      return res.status(400).json({ success: false });
    }
  
    // Insertar o actualizar la calificación en la base de datos
    const sql = 'INSERT INTO estrellitas (id_usuarios, rating) VALUES (?, ?) ON DUPLICATE KEY UPDATE rating = ?';
    conexion.query(sql, [idUsuario, rating, rating], (error) => {
      if (error) {
        console.error('Error al insertar la calificación:', error);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true });
      console.log('Calificacion Enviada con exito.');
    });
});

app.post('/rutaComentarios', [
    body('comentario', 'Ingresa tu comentario').exists(),
],(req,res)=>{
    const errors = validationResult(req);
    const valores = req.body;
    if (!errors.isEmpty()) {
        const validaciones = errors.array();
        return res.json({success: false, validaciones, valores});
    }else{
        const datos = req.body;
        let comentario = datos.comentario;
        let userCorreo = req.session.userCorreo
        conexion.query('SELECT id_usuarios FROM usuarios WHERE correo = ?', [userCorreo], (error, results)=>{
            if (error) {
                console.error('Error al obtener el id del usuario:', error);
                res.status(500).json({ success: false });
                return;
            }
            if (results.length > 0){
                const userId = results[0].id_usuarios;
                const query = 'INSERT INTO comentarios (text_comentario, id_usuarios) VALUES (?, ?)';
                conexion.query(query, [comentario,userId], (error, results) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).json({ success: false, message: 'Error al guardar el comentario' });
                    }
                    return res.json({ success: true });
                });
            }
        });
    }
});



// Actualizar el comentario existente
app.post('/api/actualizarComentario/:id', (req, res) => {
    const comentarioId = req.params.id;
    const { text_comentario } = req.body;

    const query = 'UPDATE comentarios SET text_comentario = ? WHERE id_comentarios = ?';
    
    conexion.query(query, [text_comentario, comentarioId], (err, result) => {
        if (err) {
            console.error('Error al actualizar el comentario:', err);
            return res.status(500).json({ error: 'Error al actualizar el comentario' });
        }
        
        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Comentario actualizado exitosamente' });
        } else {
            res.status(404).json({ error: 'Comentario no encontrado' });
        }
    });
});



const PORT = 3000;

app.listen(PORT, '0.0.0.0', () => {
    const ip = require('os').networkInterfaces();
    const networkInterfaces = Object.values(ip)
        .flat()
        .filter((details) => details.family === 'IPv4' && !details.internal);

    const ipAddress = networkInterfaces.length > 0 ? networkInterfaces[0].address : 'localhost';

    console.log(`SERVER UP en http://${ipAddress}:${PORT}`);
});