"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const movieController_1 = require("../controllers/movieController");
const router = (0, express_1.Router)();
// Get all movies
router.get('/movies', movieController_1.getAllMovies);
// Get a specific movie
router.get('/movies/:id', movieController_1.getMovie);
// Create a new movie
router.post('/movies', movieController_1.createMovie);
// Update a movie
router.put('/movies/:id', movieController_1.updateMovie);
// Delete a movie
router.delete('/movies/:id', movieController_1.deleteMovie);
// Update movie seats
router.patch('/movies/:id/seats', movieController_1.updateMovieSeats);
exports.default = router;
