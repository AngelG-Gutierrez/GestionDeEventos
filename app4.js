const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const app = express();
const path = require('path');
const { body, validationResult } = require('express-validator');
const mysql = require("mysql2");
var cors = require('cors');
const crypto = require('crypto');
const { sendEmail } = require('./mail');
const os = require('os');

// ==========================================
// 1. CONFIGURACIÓN DE BASE DE DATOS
// ==========================================
const dbOptions = {
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "PalomaH1",
    database: "copia_db_shorty"
};

let conexion = mysql.createConnection(dbOptions);

// Verificar conexión a la base de datos principal
conexion.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database.');
});

// ==========================================
// 2. CONFIGURACIÓN DE SESIONES EN MYSQL
// ==========================================
const sessionStore = new MySQLStore({
    ...dbOptions,
    clearExpired: true, // Limpia la BD automáticamente de sesiones viejas
    checkExpirationInterval: 900000, // Revisa cada 15 min
    expiration: 86400000 // La sesión en BD expira en 24 horas
});

app.use(session({
    key: 'shorty_session', // Nombre de la cookie
    secret: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyaWRmZnZxa3Rwb3Jlb3loeGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjA3MjgsImV4cCI6MjA5MjUzNjcyOH0.VmWSWXyjwzrq3fs7BMmhBDlPgnmEpjaDpC_C7Z05Kb4', // Tu secreto (idealmente mover a .env en el futuro)
    store: sessionStore, // Manejo concurrente guardando en BD
    resave: false,
    saveUninitialized: false, // Solo guarda sesión si el usuario hace login
    cookie: { 
        secure: false, // Cambiar a true si usas HTTPS
        httpOnly: true, // Seguridad contra XSS
        maxAge: 86400000, // 24 horas
        sameSite: 'lax'
    }
}));

// ==========================================
// 3. MIDDLEWARES GENERALES
// ==========================================
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 4. MIDDLEWARES DE PROTECCIÓN
// ==========================================

// Middleware para proteger Vistas (EJS)
const requerirAutenticacion = (req, res, next) => {
    if (req.session && req.session.userCorreo && req.session.idUsuario) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Middleware para proteger Endpoints (API JSON)
const requerirAuthAPI = (req, res, next) => {
    if (req.session && req.session.idUsuario) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'No autorizado. Por favor inicia sesión.' });
    }
};


// ==========================================
// 5. RUTAS PÚBLICAS (Vistas)
// ==========================================

app.get('/login', (req, res) => {
    if (req.session.userCorreo) {
        return res.redirect('/inicioexitoso'); // Si ya tiene sesión, no mostrar el form
    }
    res.render('sesion');
});

app.get('/registrar', (req, res) => {
    res.render('Registro', { valores: {}, validaciones: [], success: true });
});

app.get('/resets', (req,res) => {
    res.render('resetpassword');
});

app.get('/recuperar', (req, res) => {
    res.render('Recuperacion');
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

app.get('/indexCalificaciones',(req,res)=>{
    res.render('IndexTablaCalificacion');
});

app.get('/indexEventos', (req,res) => {
    res.render('indexTablasEventos');
});


// ==========================================
// 6. RUTAS PROTEGIDAS (Vistas)
// ==========================================

app.get('/inicioexitoso', requerirAutenticacion, (req, res) => {
    res.render('pantallaur');
});

app.get('/citas', requerirAutenticacion, (req, res) => {
    res.render('interfazcitas');
});

app.get('/citafirmadecontrato', requerirAutenticacion, (req, res) => {
    res.render('interfazcitafirma');
});

app.get('/enviarcalificacion', requerirAutenticacion, (req, res)=>{
    res.render('enviarcalificacion',{
        idUsuario: req.session.idUsuario
    });
});

app.get('/indexadmin', requerirAutenticacion, (req, res) => {
    conexion.query('SELECT nombre, apellidos, fechanacimiento, correo, num_tel FROM usuarios WHERE id_usuarios = ?', [req.session.idUsuario], (error, results) => {
        if (error || results.length === 0) return res.status(500).send('Error al cargar datos del usuario');
        const usuario = results[0];
        res.render('indexTablas', {
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            fechanacimiento: usuario.fechanacimiento,
            correo: usuario.correo,
            num_tel: usuario.num_tel,
        });
    });
});

app.get('/indexconfig', requerirAutenticacion, (req, res) => {
    conexion.query('SELECT nombre, apellidos,fechanacimiento,edad,correo,num_tel,contrasena, id_usuarios FROM usuarios WHERE id_usuarios = ?', [req.session.idUsuario], (error, results) => {
        if (error || results.length === 0) return res.status(500).send('Error al cargar configuración');
        const usuario = results[0];
        res.render('indexconfi', {
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            fechanacimiento: usuario.fechanacimiento,
            edad: usuario.edad,
            correo: usuario.correo,
            num_tel: usuario.num_tel,
            contrasena: usuario.contrasena,
        });
    });
});

app.get('/usuarioedit', requerirAutenticacion, (req, res) => {
    conexion.query('SELECT nombre, apellidos,fechanacimiento,edad,correo,num_tel,contrasena,id_usuarios FROM usuarios WHERE id_usuarios = ?', [req.session.idUsuario], (error, results) => {
        if (error || results.length === 0) return res.status(500).send('Error al cargar datos para editar');
        const usuario = results[0];
        res.render('adminusuario', {
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            fechanacimiento: usuario.fechanacimiento,
            edad: usuario.edad,
            correo: usuario.correo,
            num_tel: usuario.num_tel,
            contrasena: usuario.contrasena,
        });
    });
});

app.get('/indexperfils', requerirAutenticacion, (req, res) => {
    conexion.query('SELECT nombre, apellidos, fechanacimiento, correo, num_tel FROM usuarios WHERE id_usuarios = ?', [req.session.idUsuario], (error, results) => {
        if (error || results.length === 0) return res.status(500).send('Error al cargar el perfil');
        const usuario = results[0];
        res.render('indexPerfil', {
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            fechanacimiento: usuario.fechanacimiento,
            correo: usuario.correo,
            num_tel: usuario.num_tel,
        });
    });
});


// ==========================================
// 7. APIS PÚBLICAS
// ==========================================

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

app.get('/recuperar/:token', (req, res) => { // Ajuste de la ruta params
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
        if (error) return res.status(500).send('Error durante la consulta de usuarios');
        res.send(filas);
    });
});

app.get('/api/eventos', (req,res)=>{
    conexion.query('SELECT * FROM fechas_eventos', (error,filas)=>{
        if(error) throw error;
        res.send(filas);
    })
});

app.get('/api/comentariosPanelAdmin', (req,res)=>{
    conexion.query('SELECT * FROM comentarios_usuarios', (error,filas)=>{
        if(error) throw error;
        res.send(filas);
    })
});

app.get('/api/calificacionesPanelAdmin', (req, res)=>{
    conexion.query('SELECT * FROM calificaciones_usuarios',(error,filas)=>{
        if(error) throw error;
        res.send(filas);
    })
});

app.get('/get-price', (req, res) => {
    const nombrePaquete = req.query.nombrePaquete;

    if (!nombrePaquete) return res.status(400).json({ error: 'Nombre del paquete es requerido' });
    
    conexion.query('SELECT precio, descripcion FROM paquetes WHERE nombrePaquete = ?', [nombrePaquete], (error, results) => {
        if (error) return res.status(500).json({ error: 'Error al obtener el precio y la descripción' });
        
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


// ==========================================
// 8. APIS PROTEGIDAS (Requieren Sesión Activa)
// ==========================================

app.get('/api/comentariosUsuario/:id', requerirAuthAPI, (req, res) => {
    const idUsuario = req.session.idUsuario;
    conexion.query('SELECT id_comentarios,text_comentario FROM comentarios WHERE id_usuarios = ?', [idUsuario], (error, comentarios) => {
        if (error) return res.status(500).send('Error al obtener los eventos del usuario');
        res.json({ comentarios: comentarios, idUsuario: idUsuario });
    });
});

app.get('/api/comentariosUsuario', requerirAuthAPI, (req, res) => {
    const idUsuario = req.session.idUsuario;
    conexion.query('SELECT id_comentarios,text_comentario FROM comentarios WHERE id_usuarios = ?', [idUsuario], (error, comentarios) => {
        if (error) return res.status(500).send('Error al obtener los eventos del usuario');
        res.json({ comentarios: comentarios, idUsuario: idUsuario });
    });
});

app.get('/api/eventosUsuario', requerirAuthAPI, (req, res) => {
    const idUsuario = req.session.idUsuario;

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
        if (error) return res.status(500).send('Error al obtener los eventos del usuario');
        res.json({ eventos: eventos, idUsuario: idUsuario });
    });
});

app.get('/check-rating', requerirAuthAPI, (req, res) => {
    const idUsuario = req.session.idUsuario;
    const sql = 'SELECT COUNT(*) AS count FROM estrellitas WHERE id_usuarios = ?';
    conexion.query(sql, [idUsuario], (error, results) => {
      if (error) return res.status(500).json({ hasRated: false });
      res.json({ hasRated: results[0].count > 0 });
    });
});

app.get('/get-user-rating', requerirAuthAPI, (req, res) => {
    const userId = req.session.idUsuario;
    conexion.query('SELECT rating FROM estrellitas WHERE id_usuarios = ?', [userId], (error, results) => {
        if (error) return res.status(500).json({ success: false, message: 'Error al obtener la calificación' });
        const rating = results.length > 0 ? results[0].rating : null;
        res.json({ success: true, rating });
    });
});


// ==========================================
// 9. PROCESOS DE LOGIN Y LOGOUT
// ==========================================

app.post('/login', (req, res) => {
    const { correo, contrasena } = req.body;
    console.log('Datos recibidos:', { correo, contrasena });

    conexion.query('SELECT id_usuarios, contrasena FROM usuarios WHERE correo = ?', [correo], (error, results) => {
        if (error) {
            console.error('Error durante el inicio de sesión:', error);
            res.status(500).send('Error durante el inicio de sesión');
            return;
        }

        if (results.length > 0) {
            const user = results[0];

            if (contrasena === user.contrasena) {
                // Generar sesión en base de datos
                req.session.userCorreo = correo;
                req.session.idUsuario = user.id_usuarios;

                // Verificación de admin
                conexion.query('SELECT * FROM admins WHERE id_usuarios = ?', [user.id_usuarios], (adminError, adminResults) => {
                    if (adminError) return res.status(500).send('Error durante la verificación de admin');

                    if (adminResults.length > 0) {
                        res.redirect('/indexadmin');
                    } else {
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

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            res.status(500).send('Error al cerrar sesión');
        } else {
            res.clearCookie('shorty_session'); // Borrar la cookie de forma limpia
            res.redirect('/login');
        }
    });
});


// ==========================================
// 10. POST - CREACIÓN Y REGISTROS
// ==========================================

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
        let { username, apellido, fechanac, telefono, email, contra } = req.body;

        conexion.query('SELECT * FROM usuarios WHERE correo = ? OR num_tel = ?', [email, telefono], (error, results) => {
            if (error) return res.json({ success: false, message: 'Error en la verificación de duplicados' });
            
            if (results.length > 0) return res.json({ success: false, message: 'Correo y/o número de teléfono ya registrados' });

            let registrame = 'INSERT INTO usuarios (nombre, apellidos, fechanacimiento, correo, contrasena, num_tel) VALUES (?, ?, ?, ?, ?, ?)';
            conexion.query(registrame, [username, apellido, fechanac, email, contra, telefono], (error, results) => {
                if (error) return res.json({ success: false, message: 'Error al registrar el usuario' });
                console.log('Datos almacenados correctamente');
                return res.json({ success: true });
            });
        });
    }
});


app.post('/citas', requerirAutenticacion, [
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
        let { direccion, fechaevento, horainicio, horafinal, paquete } = datos;
        const userId = req.session.idUsuario;

        conexion.query('SELECT id_paquetes FROM paquetes WHERE nombrePaquete = ?', [paquete], (error, results) => {
            if (error || results.length === 0) return res.status(500).send('Error al obtener el ID del paquete');
            
            const paqueteId = results[0].id_paquetes;
            const insertarEvento = 'INSERT INTO eventos (lugar_evento, fecha_evento, hora_inicio, hora_final, id_usuarios, id_paquetes) VALUES (?, ?, ?, ?, ?, ?)';
            
            conexion.query(insertarEvento, [direccion, fechaevento, horainicio, horafinal, userId, paqueteId], (error) => {
                if (error) return res.status(500).send('Error al insertar datos en eventos');
                res.redirect('/citafirmadecontrato');
            });
        });
    }
});

app.post('/citafirmadecontrato', requerirAutenticacion, [
  body('fechafirma', 'Ingresa la fecha').exists().isDate(),
  body('horafirma', 'Ingresa la hora').exists().isLength({ min: 1 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.render('citasfirmadecontrato', { validaciones: errors.array(), valores: req.body });

  const { fechafirma, horafirma } = req.body;
  const userId = req.session.idUsuario;

  const insertarCita = 'INSERT INTO citas (fecha, hora, id_usuarios) VALUES (?, ?, ?)';
  conexion.query(insertarCita, [fechafirma, horafirma, userId], (error) => {
    if (error) return res.status(500).send('Error al insertar datos en citas');
    res.redirect('/inicioexitoso');
  });
});


// ==========================================
// 11. POST - ACTUALIZACIONES Y ELIMINACIONES
// ==========================================

app.post('/actualizarAdmin', requerirAutenticacion, [
    body('correo').exists().isLength({max: 50}),
    body('telefono').exists().isLength({ max: 10 }),
    body('contraseña').exists().isLength({ max: 50 }),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.json({ success: false, validaciones: errors.array(), valores: req.body });
    
    let { telefono, correo, contraseña } = req.body;
    let idUsuario = req.session.idUsuario;
    
    conexion.query("UPDATE usuarios SET num_tel = ?, contrasena = ?, correo = ? WHERE id_usuarios = ?", [telefono, contraseña, correo, idUsuario], (error, results) => {
        if (error) return res.status(500).json({ success: false, message: 'Error al actualizar datos' });
        
        req.session.destroy(() => res.json({ success: true }));
    });
});

app.post('/actualizarUsuario', requerirAutenticacion, [
    body('telefono', 'Ingresa tu nuevo telefono').exists().isLength({ max: 10 }),
    body('correo', 'Ingresa tu nuevo correo').exists().isLength({max: 50}),
    body('passwrd', 'Ingresa tu nueva contraseña').exists().isLength({ max: 50 }),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.json({ success: false, validaciones: errors.array(), valores: req.body });
    
    let { telefono, correo, passwrd } = req.body;
    let idUsuario = req.session.idUsuario;
    
    conexion.query("UPDATE usuarios SET num_tel = ?, correo = ?, contrasena = ? WHERE id_usuarios = ?", [telefono, correo, passwrd, idUsuario], (error, results) => {
        if (error) return res.status(500).json({ success: false, message: 'Error al actualizar datos' });
        req.session.destroy(() => res.json({ success: true }));
    });
});

app.post('/eliminarCuentaAdmin', requerirAutenticacion, (req, res) => {
    conexion.query("DELETE FROM usuarios WHERE id_usuarios = ?", [req.session.idUsuario], (error, results) => {
        req.session.destroy(() => res.redirect('/logout'));
    });
});

app.post('/eliminarCuentaUsuario', requerirAutenticacion, (req, res) => {
    conexion.query("DELETE FROM usuarios WHERE id_usuarios = ?", [req.session.idUsuario], (error, results) => {
        req.session.destroy(() => res.redirect('/logout'));
    });
});

app.post('/eliminarCuentaUsuarioPanel', requerirAuthAPI, (req, res) => {
    const idUsuario = req.body.idUsuario;
    if (!idUsuario) return res.status(400).send('ID de usuario no proporcionado');
    conexion.query("DELETE FROM usuarios WHERE id_usuarios = ?", [idUsuario], (error, results) => { res.status(200).send('OK') });
});

app.post('/eliminarEventoUsuarioPanel', requerirAuthAPI, (req, res) => {
    const idUsuario = req.body.idUsuario;
    if (!idUsuario) return res.status(400).send('ID de usuario no proporcionado');
    conexion.query("DELETE FROM eventos WHERE id_usuarios = ?", [idUsuario], (error, results) => { res.status(200).send('OK') });
});

app.post('/eliminarEventoUsuarios', requerirAuthAPI, (req, res) => {
    const Id_Evento = req.body.Id_Evento;
    if (!Id_Evento) return res.status(400).send('ID de evento no proporcionado');
    conexion.query("DELETE FROM eventos WHERE id_eventos = ?", [Id_Evento], (error, results) => { res.status(200).send('OK') });
});

app.post('/eliminarComentarioUsuarios', requerirAuthAPI, (req, res) => {
    const id_comentarios = req.body.id_comentarios;
    if (!id_comentarios) return res.status(400).send('ID de comentario no proporcionado');
    conexion.query("DELETE FROM comentarios WHERE id_comentarios = ?", [id_comentarios], (error, results) => { res.status(200).send('OK') });
});

app.post('/volverAdminPanel', requerirAuthAPI, (req, res) => {
    const idUsuario = req.body.idUsuario;
    if (!idUsuario) return res.status(400).send('ID de usuario no proporcionado');

    conexion.query("SELECT * FROM admins WHERE id_usuarios = ?", [idUsuario], (error, results) => {
        if (error) return res.status(500).send('Error al verificar administrador');
        if (results.length > 0) return res.status(400).send('El usuario ya es administrador');

        conexion.query("INSERT INTO admins(tipoAdmin,id_usuarios) VALUES (0,?)", [idUsuario], (error, results) => {
            if (error) return res.status(500).send('Error al convertir admin');
            res.status(200).send('Usuario Admin Activado');
        });
    });
});


// ==========================================
// 12. UTILIDADES (Recuperación y Comentarios)
// ==========================================

// Función para obtener la IP del servidor
const getServerIp = () => {
    const networkInterfaces = Object.values(os.networkInterfaces())
        .flat()
        .filter((details) => details.family === 'IPv4' && !details.internal);

    return networkInterfaces.length > 0 ? networkInterfaces[0].address : 'localhost';
};

const bcrypt = require('bcrypt'); // Añadir al inicio del archivo
const saltRounds = 10;

app.post('/recuperar', (req, res) => {
    const { correo } = req.body;

    // Siempre respondemos lo mismo para evitar Account Enumeration
    const mensajeExito = { success: true, message: 'Si el correo existe, se ha enviado un enlace de recuperación.' };

    conexion.query('SELECT id_usuarios FROM usuarios WHERE correo = ?', [correo], (error, results) => {
        if (error) return res.status(500).json({ success: false, message: 'Error de servidor' });

        if (results.length > 0) {
            const userId = results[0].id_usuarios;
            const token = crypto.randomBytes(20).toString('hex');
            const expires = Date.now() + 14400000; // 4 horas

            conexion.query('INSERT INTO password_resets (id_usuarios, token, expires) VALUES (?, ?, ?)', [userId, token, expires], (err) => {
                if (err) return console.log('Error DB al generar token');
                
                const resetLink = `http://${getServerIp()}:3000/resets?token=${token}`;
                sendEmail(correo, 'Recuperación de Contraseña', `Tu enlace de recuperación: ${resetLink}`).catch(console.error);
            });
        }
        
        // El response se manda INMEDIATAMENTE, sin importar si el correo se encontró o no
        res.json(mensajeExito);
    });
});

app.post('/resets', (req, res) => {
    const { token, contrasena } = req.body;
    const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    conexion.query('SELECT * FROM password_resets WHERE token = ? AND expires > ?', [token, formattedDate], (error, results) => {
        if (error) return res.status(500).send('Error de base de datos');

        if (results.length > 0) {
            const userId = results[0].id_usuarios;

            // Hashing seguro de la contraseña antes de guardarla (OWASP)
            bcrypt.hash(contrasena, saltRounds, (err, hash) => {
                if (err) return res.status(500).send('Error al encriptar');

                conexion.query('UPDATE usuarios SET contrasena = ? WHERE id_usuarios = ?', [hash, userId], (updateErr) => {
                    if (updateErr) return res.status(500).send('Error al actualizar');

                    // Destruimos el token para que no se pueda reusar
                    conexion.query('DELETE FROM password_resets WHERE token = ?', [token], () => {
                        res.send('Contraseña cambiada con éxito');
                    });
                });
            });
        } else {
            res.status(400).send('Token inválido o expirado');
        }
    });
});

app.post('/enviarcalificacion', requerirAuthAPI, (req, res) => {
    const { rating } = req.body;
    const idUsuario = req.session.idUsuario;
    if (!rating) return res.status(400).json({ success: false });
  
    const sql = 'INSERT INTO estrellitas (id_usuarios, rating) VALUES (?, ?) ON DUPLICATE KEY UPDATE rating = ?';
    conexion.query(sql, [idUsuario, rating, rating], (error) => {
      if (error) return res.status(500).json({ success: false });
      res.json({ success: true });
    });
});

app.post('/rutaComentarios', requerirAuthAPI, [
    body('comentario', 'Ingresa tu comentario').exists(),
],(req,res)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.json({success: false, validaciones: errors.array(), valores: req.body});
    
    const { comentario } = req.body;
    const userId = req.session.idUsuario;
    
    conexion.query('INSERT INTO comentarios (text_comentario, id_usuarios) VALUES (?, ?)', [comentario, userId], (error, results) => {
        if (error) return res.status(500).json({ success: false, message: 'Error al guardar el comentario' });
        return res.json({ success: true });
    });
});

app.post('/api/actualizarComentario/:id', requerirAuthAPI, (req, res) => {
    const comentarioId = req.params.id;
    const { text_comentario } = req.body;

    conexion.query('UPDATE comentarios SET text_comentario = ? WHERE id_comentarios = ?', [text_comentario, comentarioId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al actualizar el comentario' });
        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Comentario actualizado exitosamente' });
        } else {
            res.status(404).json({ error: 'Comentario no encontrado' });
        }
    });
});


// ==========================================
// 13. ARRANQUE DEL SERVIDOR
// ==========================================
const PORT = 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVER UP en http://${getServerIp()}:${PORT}`);
});