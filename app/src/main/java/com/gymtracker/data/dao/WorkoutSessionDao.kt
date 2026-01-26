package com.gymtracker.data.dao

import androidx.room.*
import com.gymtracker.data.entity.WorkoutSession
import kotlinx.coroutines.flow.Flow

@Dao
interface WorkoutSessionDao {
    @Query("SELECT * FROM workout_sessions WHERE dayTemplateId = :dayTemplateId ORDER BY date DESC")
    fun getSessionsForDayTemplate(dayTemplateId: Long): Flow<List<WorkoutSession>>

    @Query("SELECT * FROM workout_sessions WHERE dayTemplateId = :dayTemplateId ORDER BY date DESC LIMIT 1")
    suspend fun getLastSessionForDayTemplate(dayTemplateId: Long): WorkoutSession?

    @Query("SELECT * FROM workout_sessions WHERE dayTemplateId = :dayTemplateId AND completed = 1 ORDER BY date DESC LIMIT 1")
    suspend fun getLastCompletedSessionForDayTemplate(dayTemplateId: Long): WorkoutSession?

    @Query("SELECT * FROM workout_sessions WHERE dayTemplateId = :dayTemplateId AND completed = 0 ORDER BY date DESC LIMIT 1")
    suspend fun getActiveSessionForDayTemplate(dayTemplateId: Long): WorkoutSession?

    @Query("SELECT * FROM workout_sessions WHERE id = :id")
    suspend fun getSessionById(id: Long): WorkoutSession?

    @Insert
    suspend fun insertSession(session: WorkoutSession): Long

    @Update
    suspend fun updateSession(session: WorkoutSession)

    @Delete
    suspend fun deleteSession(session: WorkoutSession)
}
