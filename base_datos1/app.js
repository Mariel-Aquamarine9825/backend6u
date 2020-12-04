const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
var connection;

const jsonParser = bodyParser.json();

openConnection = () => {
    connection = mysql.createConnection({
        host: 'localhost',
        port: 3308, // 3306
        user: 'root',
        password: '',
        database: 'ejemplo1'
    });

    connection.connect((error) => {
        if (error) {
            // throw error
            console.log('Ha habido un error en la conexion');
        } else {
            console.log('Conexion realizada correctamente');
        }
    })
}

closeConnection = () => {
    connection.end();
}

// EJERCICIO: Crear un nuevo endpoint /studentsfilter
// que retorne los estudiantes cuyo first_name tenga
// el caracter enviado en el query string firstName
// 13:00

// EJERCICIO: Crear un endpoint GET /students/:id
// que retorne el estudiante que coincide con el parametro id
// 13:50

app.get('/studentsfilter', (req, res) => {
    openConnection();

    let sql = 'SELECT id, first_name AS firstName, last_name AS lastName, ' +
              'semester, birth_date AS birthDate, city_id AS cityId ' +
              'FROM student WHERE first_name LIKE ?';

    connection.query(sql,
        ["%" + req.query.firstName + "%"],
        (error, rows) => {
        if (error) {
            throw error;
        }

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(rows));
        closeConnection();
    })
});

app.get('/students', (req, res) => {
    openConnection();

    connection.query('SELECT * FROM student WHERE semester = ?',
        [req.query.semester],
        (error, rows) => {
        if (error) {
            throw error;
        }

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(rows));
        closeConnection();
    })
});

app.post('/students', jsonParser, (req, res) => {
    openConnection();

    connection.query('INSERT INTO student(first_name, last_name, birth_date, semester, city_id) VALUES (?, ?, ?, ?, ?)',
        [req.body.firstName, req.body.lastName, req.body.birthDate, req.body.semester, req.body.cityId],
       (error, rows) => {
        if (error) {
            throw error;
        }

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(rows));
        closeConnection();
    })
});

app.put('/students', jsonParser, (req, res) => {
    openConnection();

    let sql = 'UPDATE student SET first_name = ?, last_name = ?, birth_date = ?, semester = ?, city_id = ? ' +
              'WHERE id = ?';
    let student = req.body;

    connection.query(sql,
        [student.firstName, student.lastName, student.birthDate, student.semester, student.cityId, student.id],
       (error, rows) => {
        if (error) {
            throw error;
        }

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(rows));
        closeConnection();
    })
});

app.delete('/students/:id', (req, res) => {
    openConnection();

    let sql = 'DELETE FROM student WHERE id = ?';

    connection.query(sql, [req.params.id],
       (error, rows) => {
        if (error) {
            throw error;
        }

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(rows));
        closeConnection();
    })
});

app.listen(3000, () => {
    console.log('Servidor inicializado');
})
