use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::net::SocketAddr;
use std::str::FromStr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

type AppState = Arc<SqlitePool>;

#[derive(Deserialize)]
struct LoginRequest {
    username: String,
}

#[derive(Serialize)]
struct LoginResponse {
    username: String,
}

#[derive(Serialize)]
struct PokedexResponse {
    pokemon_ids: Vec<i64>,
}

#[derive(Deserialize)]
struct CatchRequest {
    username: String,
    pokemon_ids: Vec<i64>,
}

#[derive(Deserialize)]
struct ReleaseRequest {
    username: String,
    pokemon_ids: Vec<i64>,
}

#[derive(Serialize)]
struct OkResponse {
    ok: bool,
}

#[derive(Deserialize)]
struct StartBattleRequest {
    username: String,
    difficulty: String,
}

#[derive(Serialize)]
struct StartBattleResponse {
    session_id: String,
}

#[derive(Deserialize)]
struct LogAnswerRequest {
    session_id: String,
    username: String,
    difficulty: String,
    question: String,
    correct_answer: i32,
    user_answer: i32,
    is_correct: bool,
}

#[derive(Deserialize)]
struct EndBattleRequest {
    session_id: String,
    result: String,
}

#[derive(Serialize, sqlx::FromRow)]
struct StatRow {
    difficulty: String,
    total: i64,
    correct: i64,
}

async fn init_db(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS players (
            username TEXT PRIMARY KEY,
            created_at TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS pokedex (
            username TEXT NOT NULL,
            pokemon_id INTEGER NOT NULL,
            caught_at TEXT NOT NULL,
            PRIMARY KEY (username, pokemon_id),
            FOREIGN KEY (username) REFERENCES players(username)
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS battle_sessions (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            result TEXT,
            created_at TEXT NOT NULL,
            ended_at TEXT,
            FOREIGN KEY (username) REFERENCES players(username)
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS math_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            username TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            question TEXT NOT NULL,
            correct_answer INTEGER NOT NULL,
            user_answer INTEGER NOT NULL,
            is_correct BOOLEAN NOT NULL,
            answered_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES battle_sessions(id)
        )",
    )
    .execute(pool)
    .await?;

    Ok(())
}

async fn handle_login(
    State(pool): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Json<LoginResponse> {
    let username = req.username.trim().to_string();
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT OR IGNORE INTO players (username, created_at) VALUES (?, ?)",
    )
    .bind(&username)
    .bind(&now)
    .execute(pool.as_ref())
    .await
    .ok();
    Json(LoginResponse { username })
}

async fn handle_get_pokedex(
    State(pool): State<AppState>,
    Path(username): Path<String>,
) -> Json<PokedexResponse> {
    let rows: Vec<(i64,)> =
        sqlx::query_as("SELECT pokemon_id FROM pokedex WHERE username = ? ORDER BY pokemon_id")
            .bind(&username)
            .fetch_all(pool.as_ref())
            .await
            .unwrap_or_default();
    Json(PokedexResponse {
        pokemon_ids: rows.into_iter().map(|(id,)| id).collect(),
    })
}

async fn handle_catch(
    State(pool): State<AppState>,
    Json(req): Json<CatchRequest>,
) -> Json<OkResponse> {
    let now = Utc::now().to_rfc3339();
    for id in &req.pokemon_ids {
        sqlx::query(
            "INSERT OR IGNORE INTO pokedex (username, pokemon_id, caught_at) VALUES (?, ?, ?)",
        )
        .bind(&req.username)
        .bind(id)
        .bind(&now)
        .execute(pool.as_ref())
        .await
        .ok();
    }
    Json(OkResponse { ok: true })
}

async fn handle_release(
    State(pool): State<AppState>,
    Json(req): Json<ReleaseRequest>,
) -> Json<OkResponse> {
    for id in &req.pokemon_ids {
        sqlx::query("DELETE FROM pokedex WHERE username = ? AND pokemon_id = ?")
            .bind(&req.username)
            .bind(id)
            .execute(pool.as_ref())
            .await
            .ok();
    }
    Json(OkResponse { ok: true })
}

async fn handle_start_battle(
    State(pool): State<AppState>,
    Json(req): Json<StartBattleRequest>,
) -> Json<StartBattleResponse> {
    let session_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO battle_sessions (id, username, difficulty, created_at) VALUES (?, ?, ?, ?)",
    )
    .bind(&session_id)
    .bind(&req.username)
    .bind(&req.difficulty)
    .bind(&now)
    .execute(pool.as_ref())
    .await
    .ok();
    Json(StartBattleResponse { session_id })
}

async fn handle_log_answer(
    State(pool): State<AppState>,
    Json(req): Json<LogAnswerRequest>,
) -> Json<OkResponse> {
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO math_answers
         (session_id, username, difficulty, question, correct_answer, user_answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&req.session_id)
    .bind(&req.username)
    .bind(&req.difficulty)
    .bind(&req.question)
    .bind(req.correct_answer)
    .bind(req.user_answer)
    .bind(req.is_correct)
    .bind(&now)
    .execute(pool.as_ref())
    .await
    .ok();
    Json(OkResponse { ok: true })
}

async fn handle_end_battle(
    State(pool): State<AppState>,
    Json(req): Json<EndBattleRequest>,
) -> Json<OkResponse> {
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "UPDATE battle_sessions SET result = ?, ended_at = ? WHERE id = ?",
    )
    .bind(&req.result)
    .bind(&now)
    .bind(&req.session_id)
    .execute(pool.as_ref())
    .await
    .ok();
    Json(OkResponse { ok: true })
}

async fn handle_get_stats(
    State(pool): State<AppState>,
    Path(username): Path<String>,
) -> Json<Vec<StatRow>> {
    let rows = sqlx::query_as::<_, StatRow>(
        "SELECT difficulty,
                COUNT(*) as total,
                COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0) as correct
         FROM math_answers
         WHERE username = ?
         GROUP BY difficulty
         ORDER BY difficulty",
    )
    .bind(&username)
    .fetch_all(pool.as_ref())
    .await
    .unwrap_or_default();
    Json(rows)
}

async fn handle_health() -> Json<OkResponse> {
    Json(OkResponse { ok: true })
}

#[tokio::main]
async fn main() {
    let db_path = "sqlite://./pokebattle.db";
    let connect_options = SqliteConnectOptions::from_str(db_path)
        .expect("invalid database URL")
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .connect_with(connect_options)
        .await
        .expect("failed to connect to database");

    init_db(&pool).await.expect("failed to initialise database");

    let state: AppState = Arc::new(pool);

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/health", get(handle_health))
        .route("/api/login", post(handle_login))
        .route("/api/pokedex/:username", get(handle_get_pokedex))
        .route("/api/pokedex/catch", post(handle_catch))
        .route("/api/pokedex/release", post(handle_release))
        .route("/api/battle/start", post(handle_start_battle))
        .route("/api/battle/answer", post(handle_log_answer))
        .route("/api/battle/end", post(handle_end_battle))
        .route("/api/stats/:username", get(handle_get_stats))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("🎮 PokéBattle backend running on http://{}", addr);
    println!("💾 Database: pokebattle.db");

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
