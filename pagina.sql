-- Crear la base de datos
CREATE DATABASE copia_db_shorty;

-- Usar la base de datos
USE copia_db_shorty;

-- Crear la tabla usuarios
CREATE TABLE usuarios (
    id_usuarios INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL,
    apellidos VARCHAR (30) NOT NULL,
    fechanacimiento DATE NOT NULL,
    correo VARCHAR(50) NOT NULL,
    contrasena VARCHAR(30) NOT NULL,
    num_tel VARCHAR(30) NOT NULL,
    edad INT NOT NULL
);


CREATE TABLE password_resets(
	id_usuarios INT NOT NULL,
    FOREIGN KEY (id_usuarios) REFERENCES usuarios (id_usuarios),
    token varchar(1000) NOT NULL,
    expires BIGINT NOT NULL
);

CREATE TABLE admins(
	idAdmin INT AUTO_INCREMENT PRIMARY KEY,
	tipoAdmin INT NOT NULL,
	id_usuarios INT NOT NULL,
    FOREIGN KEY (id_usuarios) REFERENCES usuarios (id_usuarios)
);

INSERT INTO admins(tipoAdmin, id_usuarios) VALUES (1,1);

-- Crear la tabla citas
CREATE TABLE citas (
    id_citas INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    id_usuarios INT NOT NULL,
    FOREIGN KEY (id_usuarios) REFERENCES usuarios (id_usuarios)
);

-- Crear la tabla paquetes
CREATE TABLE paquetes(
    id_paquetes INT AUTO_INCREMENT PRIMARY KEY,
    nombrePaquete VARCHAR(30) NOT NULL,
    precio VARCHAR(30) NOT NULL,
    descripcion VARCHAR(100) NOT NULL
);

INSERT INTO paquetes (nombrePaquete, precio, descripcion) VALUES
('Paquete Básico', '$1000', 'Includes basic sound system and lighting'),
('Medio Equipo', '$2000', 'Includes sound system, lighting, and DJ'),
('Paquete Completo', '$3000', 'Includes full sound system, advanced lighting, and live performance');

-- Crear la tabla eventos
CREATE TABLE eventos (
    id_eventos INT AUTO_INCREMENT PRIMARY KEY,
    lugar_evento VARCHAR(70) NOT NULL,
    fecha_evento DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_final TIME NOT NULL,
    id_usuarios INT NOT NULL,
    id_paquetes INT NOT NULL,
    FOREIGN KEY (id_usuarios) REFERENCES usuarios (id_usuarios),
    FOREIGN KEY (id_paquetes) REFERENCES paquetes (id_paquetes)
);

-- Crear la tabla comentarios
CREATE TABLE comentarios (
    id_comentarios INT AUTO_INCREMENT PRIMARY KEY,
    text_comentario TEXT,
    id_usuarios INT,
    FOREIGN KEY (id_usuarios) REFERENCES usuarios (id_usuarios)
);

CREATE TABLE estrellitas (
    id_estrellita INT AUTO_INCREMENT PRIMARY KEY,
    id_usuarios INT NOT NULL,
    rating TINYINT NOT NULL,
    FOREIGN KEY (id_usuarios) REFERENCES usuarios (id_usuarios) ON DELETE CASCADE,
    UNIQUE KEY (id_usuarios)
);


-- Triggers y vistas

-- Crear el trigger para calcular la edad antes de insertar un nuevo usuario
DELIMITER $$
CREATE TRIGGER trg_CalcularEdad
BEFORE INSERT ON usuarios
FOR EACH ROW
BEGIN
    -- Calcular la edad considerando si el cumpleaños ya ha pasado en el año actual
    SET NEW.edad = TIMESTAMPDIFF(YEAR, NEW.fechanacimiento, CURDATE()) - 
                   (IF(
                        DATE_FORMAT(NEW.fechanacimiento, '-%d%m') > DATE_FORMAT(CURDATE(), '%d-%m'),
                        1,
                        0
                    ));
END;
$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER insertarAdmins
BEFORE INSERT ON admins
FOR EACH ROW
BEGIN
    SET NEW.tipoAdmin = 0;
END;
$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER eliminarUsuario
BEFORE DELETE ON usuarios
FOR EACH ROW
BEGIN
    -- Busqueda de id en tablas hijas para eliminar en tabla padre
	IF EXISTS (SELECT 1 FROM admins WHERE id_usuarios = OLD.id_usuarios) THEN
	DELETE FROM admins WHERE id_usuarios = OLD.id_usuarios;
    END IF;
    
    IF EXISTS(SELECT 1 FROM comentarios WHERE id_usuarios = OLD.id_usuarios) THEN
    DELETE FROM comentarios WHERE id_usuarios = OLD.id_usuarios;
    END IF;
    
	IF EXISTS (SELECT 1 FROM eventos WHERE id_usuarios = OLD.id_usuarios) THEN
	DELETE FROM eventos WHERE id_usuarios = OLD.id_usuarios;
    END IF;
    
    IF EXISTS (SELECT 1 FROM citas WHERE id_usuarios = OLD.id_usuarios) THEN
	DELETE FROM citas WHERE id_usuarios = OLD.id_usuarios;
    END IF;
    
END;
$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER eliminarevento
AFTER DELETE ON eventos
FOR EACH ROW
BEGIN
    -- Busqueda de id en tablas hijas para eliminar en tabla padre
	IF EXISTS (SELECT 1 FROM citas WHERE id_usuarios = OLD.id_usuarios) THEN
	DELETE FROM citas WHERE id_usuarios = OLD.id_usuarios;
    END IF;
    
	IF EXISTS (SELECT 1 FROM eventos WHERE id_usuarios = OLD.id_usuarios) THEN
	DELETE FROM eventos WHERE id_usuarios = OLD.id_usuarios;
    END IF;
    
END;
$$
DELIMITER ;

CREATE VIEW fechas_eventos AS
SELECT 
	b.id_usuarios AS Id_Usuario,
    b.nombre AS Nombre_Usuario, 
    b.apellidos AS apellidos_Usuario,
    d.lugar_evento AS Lugar_Evento, 
    d.fecha_evento AS Fecha_Evento, 
    d.hora_inicio AS Hora_Inicio, 
    d.hora_final AS Hora_Final, 
    f.nombrePaquete AS NombrePaquete,
    f.precio AS Precio,
    a.fecha AS fecha_citacontrato,
    a.hora AS hora_citacontrato
FROM 
    usuarios b
INNER JOIN 
    eventos d ON b.id_usuarios = d.id_usuarios
INNER JOIN 
    paquetes f ON d.id_paquetes = f.id_paquetes
INNER JOIN 
    citas a ON d.id_usuarios = a.id_usuarios;

CREATE VIEW comentarios_usuarios AS
SELECT 
	b.id_usuarios AS Id_Usuario,
    d.id_comentarios AS Id_Comentario,
    b.nombre AS Nombre_Usuario, 
    b.apellidos AS apellidos_Usuario,
    d.text_comentario AS Comentario
FROM 
    usuarios b
INNER JOIN 
    comentarios d ON b.id_usuarios = d.id_usuarios;
    
CREATE VIEW calificaciones_usuarios AS
SELECT 
	b.id_usuarios AS Id_Usuario,
    b.nombre AS Nombre_Usuario, 
    b.apellidos AS apellidos_Usuario,
    b.correo AS Correo,
    d.rating AS Calificacion_Usuario
FROM 
    usuarios b
INNER JOIN 
    estrellitas d ON b.id_usuarios = d.id_usuarios;
    
-- TABLAS Y VISTAS
SELECT * FROM usuarios;
SELECT * FROM password_resets;
SELECT * FROM admins;
SELECT * FROM citas;
SELECT * FROM paquetes;
SELECT * FROM eventos;
SELECT * FROM comentarios;
SELECT * FROM estrellitas;
SELECT * FROM fechas_eventos;
SELECT * FROM comentarios_usuarios;
SELECT * FROM calificaciones_usuarios;