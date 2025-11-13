# api/urls.py

from django.urls import path
from .views_auth import nonce, verify
from .views_quiz import quiz_public_state, quiz_user_view, quiz_settings, quiz_stats
from .views_session import session_start, session_answer, session_finish, session_status, settlement_status  # â† ADDED
from .views_tournament_quiz import (
    tournament_session_start,
    tournament_session_finish,
    tournament_session_status,
    tournament_daily_plays,
)
from .views_tournament import (
    tournament_list, tournament_latest,
    tournament_info, tournament_players, tournament_leaderboard, tournament_me,
    tournament_register_tx, tournament_buy_passes_tx, tournament_create_tx,
    tournament_settle_tx, tournament_refund_tx, tournament_resolve_tx,
    erc20_allowance, erc20_approve_tx,
)

urlpatterns = [
    # --- auth ---
    path('auth/nonce/', nonce),
    path('auth/verify/', verify),

    # --- quiz ---
    path('quiz/state/', quiz_public_state),
    path('quiz/user/', quiz_user_view),
    path('quiz/session/start/', session_start),
    path('quiz/session/answer/', session_answer),
    path('quiz/session/finish/', session_finish),
    path('quiz/session/status/<int:sid>/', session_status),

    path('quiz/settings/', quiz_settings),    # <-- new
    path('quiz/stats/', quiz_stats),          # <-- new



    # --- settlement status (NEW) ---
    path('settlement/status/', settlement_status),

    # --- tournaments: reads/discovery ---
    path('tournament/list/', tournament_list),
    path('tournament/latest/', tournament_latest),
    path('tournament/<int:tid>/info/', tournament_info),
    path('tournament/<int:tid>/players/', tournament_players),
    path('tournament/<int:tid>/leaderboard/', tournament_leaderboard),
    path('tournament/<int:tid>/me/', tournament_me),

    
    path('tournament/session/start/', tournament_session_start),
    path('tournament/session/finish/', tournament_session_finish),
    path('tournament/session/status/<int:session_id>/', tournament_session_status),

    # --- tournaments: tx builders (user/owner) ---
    path('tournament/<int:tid>/register/', tournament_register_tx),
    path('tournament/<int:tid>/passes/', tournament_buy_passes_tx),

    # owner actions
    path('tournament/create/', tournament_create_tx),
    path('tournament/<int:tid>/settle/', tournament_settle_tx),
    path('tournament/<int:tid>/refund/', tournament_refund_tx),
    path('tournament/<int:tid>/resolve/', tournament_resolve_tx),
    path('tournament/<int:tournament_id>/daily-plays/', tournament_daily_plays),
    # --- ERC20 helpers ---
    path('erc20/allowance/', erc20_allowance),
    path('erc20/approve/', erc20_approve_tx),
]