from sync_real_recommendations import run_sync, setup_recommendations_table if hasattr(__import__('sync_real_recommendations'), 'setup_recommendations_table') else run_sync

if __name__ == "__main__":
    run_sync()
