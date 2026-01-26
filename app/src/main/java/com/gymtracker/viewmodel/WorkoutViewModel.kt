package com.gymtracker.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.gymtracker.data.dao.DayTemplateDao
import com.gymtracker.data.dao.SessionExerciseDao
import com.gymtracker.data.dao.WorkoutSessionDao
import com.gymtracker.data.entity.SessionExercise
import com.gymtracker.data.entity.SessionSet
import com.gymtracker.data.entity.WorkoutSession
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class ExerciseWithSets(
    val exercise: SessionExercise,
    val sets: List<SessionSet>
)

data class WorkoutState(
    val session: WorkoutSession? = null,
    val exercises: List<ExerciseWithSets> = emptyList(),
    val isLoading: Boolean = false
)

class WorkoutViewModel(
    private val dayTemplateDao: DayTemplateDao,
    private val sessionDao: WorkoutSessionDao,
    private val exerciseDao: SessionExerciseDao
) : ViewModel() {

    private val _workoutState = MutableStateFlow(WorkoutState())
    val workoutState: StateFlow<WorkoutState> = _workoutState

    fun getSessionsForDayTemplate(dayTemplateId: Long): Flow<List<WorkoutSession>> {
        return sessionDao.getSessionsForDayTemplate(dayTemplateId)
    }

    fun startWorkout(dayTemplateId: Long) {
        viewModelScope.launch {
            _workoutState.value = _workoutState.value.copy(isLoading = true)

            // Check if there's already an active (uncompleted) session for this day
            val activeSession = sessionDao.getActiveSessionForDayTemplate(dayTemplateId)

            if (activeSession != null) {
                // Resume the existing active session
                val exercises = exerciseDao.getExercisesForSessionOnce(activeSession.id)
                val allSets = exerciseDao.getSetsForExercises(exercises.map { it.id })
                val exercisesWithSets = exercises.map { exercise ->
                    ExerciseWithSets(
                        exercise = exercise,
                        sets = allSets.filter { it.sessionExerciseId == exercise.id }.sortedBy { it.setNumber }
                    )
                }
                _workoutState.value = WorkoutState(session = activeSession, exercises = exercisesWithSets)
                return@launch
            }

            // No active session, create a new one
            val newSession = WorkoutSession(
                dayTemplateId = dayTemplateId,
                date = System.currentTimeMillis()
            )
            val sessionId = sessionDao.insertSession(newSession)
            val session = sessionDao.getSessionById(sessionId)!!

            // Look for the last COMPLETED session to copy exercises from
            val lastCompletedSession = sessionDao.getLastCompletedSessionForDayTemplate(dayTemplateId)

            if (lastCompletedSession != null) {
                val previousExercises = exerciseDao.getExercisesForSessionOnce(lastCompletedSession.id)
                val previousSets = exerciseDao.getSetsForExercises(previousExercises.map { it.id })

                val exercisesWithSets = mutableListOf<ExerciseWithSets>()
                for (prevExercise in previousExercises) {
                    val newExerciseId = exerciseDao.insertExercise(
                        SessionExercise(
                            sessionId = sessionId,
                            exerciseName = prevExercise.exerciseName,
                            sortOrder = prevExercise.sortOrder
                        )
                    )
                    val newExercise = exerciseDao.getExerciseById(newExerciseId)!!

                    val prevSetsForExercise = previousSets.filter { it.sessionExerciseId == prevExercise.id }
                    val newSets = mutableListOf<SessionSet>()
                    for (prevSet in prevSetsForExercise) {
                        val newSetId = exerciseDao.insertSet(
                            SessionSet(
                                sessionExerciseId = newExerciseId,
                                setNumber = prevSet.setNumber,
                                weight = prevSet.weight,
                                reps = prevSet.reps
                            )
                        )
                        newSets.add(SessionSet(id = newSetId, sessionExerciseId = newExerciseId, setNumber = prevSet.setNumber, weight = prevSet.weight, reps = prevSet.reps))
                    }
                    exercisesWithSets.add(ExerciseWithSets(newExercise, newSets))
                }
                _workoutState.value = WorkoutState(session = session, exercises = exercisesWithSets)
            } else {
                val templateExercises = dayTemplateDao.getExercisesForTemplateOnce(dayTemplateId)
                val exercisesWithSets = mutableListOf<ExerciseWithSets>()
                for (templateExercise in templateExercises) {
                    val newExerciseId = exerciseDao.insertExercise(
                        SessionExercise(
                            sessionId = sessionId,
                            exerciseName = templateExercise.exerciseName,
                            sortOrder = templateExercise.sortOrder
                        )
                    )
                    val newExercise = exerciseDao.getExerciseById(newExerciseId)!!
                    exercisesWithSets.add(ExerciseWithSets(newExercise, emptyList()))
                }
                _workoutState.value = WorkoutState(session = session, exercises = exercisesWithSets)
            }
        }
    }

    fun loadSessionForHistory(sessionId: Long) {
        viewModelScope.launch {
            _workoutState.value = _workoutState.value.copy(isLoading = true)
            val session = sessionDao.getSessionById(sessionId)
            if (session != null) {
                val exercises = exerciseDao.getExercisesForSessionOnce(sessionId)
                val allSets = exerciseDao.getSetsForExercises(exercises.map { it.id })
                val exercisesWithSets = exercises.map { exercise ->
                    ExerciseWithSets(
                        exercise = exercise,
                        sets = allSets.filter { it.sessionExerciseId == exercise.id }.sortedBy { it.setNumber }
                    )
                }
                _workoutState.value = WorkoutState(session = session, exercises = exercisesWithSets)
            }
        }
    }

    fun addExercise(exerciseName: String) {
        val session = _workoutState.value.session ?: return
        viewModelScope.launch {
            val currentExercises = _workoutState.value.exercises
            val newSortOrder = (currentExercises.maxOfOrNull { it.exercise.sortOrder } ?: -1) + 1
            val newExerciseId = exerciseDao.insertExercise(
                SessionExercise(
                    sessionId = session.id,
                    exerciseName = exerciseName,
                    sortOrder = newSortOrder
                )
            )
            val newExercise = exerciseDao.getExerciseById(newExerciseId)!!
            _workoutState.value = _workoutState.value.copy(
                exercises = currentExercises + ExerciseWithSets(newExercise, emptyList())
            )
        }
    }

    fun deleteExercise(exercise: SessionExercise) {
        viewModelScope.launch {
            exerciseDao.deleteExercise(exercise)
            _workoutState.value = _workoutState.value.copy(
                exercises = _workoutState.value.exercises.filter { it.exercise.id != exercise.id }
            )
        }
    }

    fun reorderExercises(fromIndex: Int, toIndex: Int) {
        val exercises = _workoutState.value.exercises.toMutableList()
        val item = exercises.removeAt(fromIndex)
        exercises.add(toIndex, item)

        viewModelScope.launch {
            exercises.forEachIndexed { index, exerciseWithSets ->
                exerciseDao.updateExerciseOrder(exerciseWithSets.exercise.id, index)
            }
        }

        _workoutState.value = _workoutState.value.copy(
            exercises = exercises.mapIndexed { index, ews ->
                ews.copy(exercise = ews.exercise.copy(sortOrder = index))
            }
        )
    }

    fun addSet(exerciseId: Long) {
        viewModelScope.launch {
            val exercises = _workoutState.value.exercises.toMutableList()
            val exerciseIndex = exercises.indexOfFirst { it.exercise.id == exerciseId }
            if (exerciseIndex >= 0) {
                val exerciseWithSets = exercises[exerciseIndex]
                val newSetNumber = (exerciseWithSets.sets.maxOfOrNull { it.setNumber } ?: 0) + 1
                val lastSet = exerciseWithSets.sets.lastOrNull()
                val newSetId = exerciseDao.insertSet(
                    SessionSet(
                        sessionExerciseId = exerciseId,
                        setNumber = newSetNumber,
                        weight = lastSet?.weight,
                        reps = lastSet?.reps ?: 0
                    )
                )
                val newSet = SessionSet(
                    id = newSetId,
                    sessionExerciseId = exerciseId,
                    setNumber = newSetNumber,
                    weight = lastSet?.weight,
                    reps = lastSet?.reps ?: 0
                )
                exercises[exerciseIndex] = exerciseWithSets.copy(
                    sets = exerciseWithSets.sets + newSet
                )
                _workoutState.value = _workoutState.value.copy(exercises = exercises)
            }
        }
    }

    fun updateSet(set: SessionSet) {
        viewModelScope.launch {
            exerciseDao.updateSet(set)
            val exercises = _workoutState.value.exercises.map { ews ->
                if (ews.exercise.id == set.sessionExerciseId) {
                    ews.copy(sets = ews.sets.map { if (it.id == set.id) set else it })
                } else ews
            }
            _workoutState.value = _workoutState.value.copy(exercises = exercises)
        }
    }

    fun deleteSet(set: SessionSet) {
        viewModelScope.launch {
            exerciseDao.deleteSet(set)
            val exercises = _workoutState.value.exercises.map { ews ->
                if (ews.exercise.id == set.sessionExerciseId) {
                    val remainingSets = ews.sets.filter { it.id != set.id }
                    remainingSets.forEachIndexed { index, s ->
                        if (s.setNumber != index + 1) {
                            exerciseDao.updateSetNumber(s.id, index + 1)
                        }
                    }
                    ews.copy(sets = remainingSets.mapIndexed { index, s ->
                        s.copy(setNumber = index + 1)
                    })
                } else ews
            }
            _workoutState.value = _workoutState.value.copy(exercises = exercises)
        }
    }

    fun finishWorkout() {
        val session = _workoutState.value.session ?: return
        viewModelScope.launch {
            sessionDao.updateSession(session.copy(completed = true))
            _workoutState.value = WorkoutState()
        }
    }

    fun clearWorkout() {
        _workoutState.value = WorkoutState()
    }

    class Factory(
        private val dayTemplateDao: DayTemplateDao,
        private val sessionDao: WorkoutSessionDao,
        private val exerciseDao: SessionExerciseDao
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return WorkoutViewModel(dayTemplateDao, sessionDao, exerciseDao) as T
        }
    }
}
