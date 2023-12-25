const express = require('express');
const Sequelize = require('sequelize');
const hbs = require('hbs');
const bodyParser =require("body-parser") 

const app = express();

app.set('view engine', 'hbs');

app.use(express.static('public'));

const sequelize = new Sequelize({
	storage: 'l9.db',
	dialect: 'sqlite',
});


const Film = sequelize.define('film', {
	id: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	title: {
		type: Sequelize.STRING(200),
	},
	year: {
		type: Sequelize.INTEGER,
	},
	directorId: {
		type: Sequelize.INTEGER,
	},
});

const Director = sequelize.define('director', {
	id: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	name: {
		type: Sequelize.STRING(200),
	},
});

const Actor = sequelize.define('actor', {
	id: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	name: {
		type: Sequelize.STRING(200),
	},
});

const FilmActor = sequelize.define('film_actor', {
	filmId: {
		type: Sequelize.INTEGER,
	},
	actorId: {
		type: Sequelize.INTEGER,
	},
});


// Устанавливаем отношения между моделями
Film.belongsTo(Director, { foreignKey: 'directorId' });
Director.hasMany(Film, { foreignKey: 'directorId' });

Actor.hasMany(FilmActor, { foreignKey: 'actorId' });
FilmActor.belongsTo(Film, { foreignKey: 'filmId' });

sequelize.sync().then((result) => {
	console.log('DB is connected!');
});

app.use(express.json());
app.use(bodyParser.urlencoded());

// https://learn.javascript.ru/destructuring-assignment
// Роут для создания фильма
app.post('/films', async (req, res) => {
	const { title, year, directorId, actors } = req.body;
	const film = await Film.create({
		title,
		year,
		directorId,
	});

	for (let actor of actors) {
		await FilmActor.create({
			filmId: film.id,
			actorId: actor,
		});
	}
	return res.status(200).json(film);
});

// Роут для получения списка фильмов
app.get('/films', async (req, res) => {
	const films = await Film.findAll({
		include: [
			{
				model: Director,
			},
		],
	});
	// return res.json(films);
	return res.render('films.hbs', {
		films,
	});
});
// Роут для отображения страницы подтверждения удаления фильма, пишим это /films/:id/delete
app.get('/films/:id/delete', async (req, res) => {
  try {
    const id = req.params.id;
    const film = await Film.findByPk(id);

    if (!film) {
      return res.status(404).render('error.hbs', {
        error: 'Film not found',
      });
    }

    return res.render('delete_film.hbs', {
      film: film,
    });
  } catch (e) {
    return res.status(404)
  }
});
// Роут для удаления фильма
app.post('/films/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const film = await Film.findByPk(id);

    if (!film) {
      return res.status(404).json({
        status: 404,
        message: 'Film not found',
      });
    }

    await film.destroy();

    const films = await Film.findAll();
    return res.status(200).render('films.hbs', { films });

  } catch (e) {
    return res.status(404).json({
      message: e.message,
    });
  }
});
// Роут для отображения информации о режиссере
app.get('/directors/:id', async (req, res) => {
  const id = req.params.id;
  const director = await Director.findByPk(id);
  const directors = await Director.findAll({ raw: true });
  return res.render('director.hbs', { director, directors });
});
// Роут для обновления информации о режиссере
app.post('/directors/:id', async (req, res) => {
  const id = req.params.id;
  const name = req.body.name;
  const director = await Director.findByPk(id);
  await director.update({ name });
	return res.redirect(`/directors/${id}`);
});

// Роут для обновления информации о фильме
app.put('/films/:id', async (req, res) => {
	try {
		const id = req.params.id;
		const film = await Film.findByPk(id);
		if (!film) {
			return res.status(404).json({
				status: 404,
				message: 'Film not found',
			});
		}
		const { title, year } = req.body;
		await film.update({
			title,
			year,
		});
		return res.status(200).json(film);
	} catch (e) {
		return res.status(404).json({
			message: e.message,
		});
	}
});
// Роут для создания нового режиссера
app.post('/directors', async (req, res) => {
	const { name } = req.body;
	const director = await Director.create({ name });
	// res.status(201).json({
	// 	director,
	// });
	return res.redirect("/directors")
});
// Роут для получения списка режиссеров
app.get('/directors', async (req, res) => {
	const directors = await Director.findAll({
		include: [
			{
				model: Film,
			},
		],
	});
	// res.status(200).json(directors);
	return res.render('directors.hbs', {
		directors,
	});
});
// Роут для обновление режиссеров1
app.get('/directors/:id', async (req, res) => {
  const id = req.params.id;
  const director = await Director.findByPk(id);
  const directors = await Director.findAll({ raw: true });
  return res.render('director.hbs', { director, directors });
});
// Роут для обновление режиссеров2
app.post('/directors/:id', async (req, res) => {
  const id = req.params.id;
  const name = req.body.name;
  const director = await Director.findByPk(id);
  await director.update({ name });
	return res.redirect(`/directors/${id}`);
});

// Роут для удаления режиссера и всех его фильмов
app.delete('/directors/:id', async (req, res) => {
	const id = req.params.id; // id = 2
	// delete from films
	// where directorId = 2
	await Film.destroy({
		where: {
			directorId: id,
		},
	});
	await Director.destroy({
		where: {
			id,
		},
	});
	return res.status(200).json({
		message: 'ok',
	});
});

//актеры
// добавление актеров
app.post('/actors', async (req, res) => {
	const name = req.body.name;
	const actor = await Actor.create({ name });
	return res.status(200).json({
		actor,
	});
});

// Роут для удаления актера
app.get('/actors/:id/delete', async (req, res) => {
  try {
    const id = req.params.id;
    const actor = await Actor.findByPk(id);

    if (!actor) {
      return res.status(404).render('error.hbs', {
        error: 'Actor not found',
      });
    }

    return res.render('delete_actor.hbs', {
      actor: actor,
    });
  } catch (e) {
    return res.status(404)
  }
});
// Роут для получения списка актеров
app.get('/actors', async (req, res) => {
  try {
    const actors = await Actor.findAll();
    return res.render('actors.hbs', { actors });
  } catch (e) {
    return res.status(404)
  }
});
// Роут для удаления актера
app.post('/actors/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const actor = await Actor.findByPk(id);

    if (!actor) {
      return res.status(404).json({
        status: 404,
        message: 'Actor not found',
      });
    }
    await actor.destroy();
    const actors = await Actor.findAll();
    return res.status(200).render('actors.hbs', { actors });
  } catch (e) {
    return res.status(404)
  }
});

// Роут для обновления информации об актере не сделал
app.put('/actors/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const actor = await Actor.findByPk(id);

    if (!actor) {
      return res.status(404).json({
        status: 404,
        message: 'Actor not found',
      });
    }
    const { name } = req.body;
    await actor.update({
      name
    });

    const actors = await Actor.findAll();
    return res.status(200).render('actorsUpdate.hbs', { actors });

  } catch (e) {
    return res.status(404).json({
      message: e.message,
    });
  }
});

app.listen(3000, () => {
	console.log('Server is started!');
});