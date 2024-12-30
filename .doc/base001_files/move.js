console.log('Init move.js')

const SudokuApp = {
    uid: '',

    isRestored: function () {
        const val = localStorage.getItem('isRestored');
        return val !== undefined && val === 'true';
    },

    setIsRestored: function () {
        localStorage.setItem('isRestored', 'true');
    },

    isPlayerInit: function () {
        const val = localStorage.getItem('player_init');
        return val !== undefined && val === '1';
    },

    backup: function () {
        const _this = this;
        const currentData = this.getCurrentData();

        if (!_this.isRestored()) {
            if (_this.isPlayerInit()) {
                $.post('/import/backup/', {gameData: JSON.stringify(currentData), uid: this.uid}, function (result) {
                    if (result.success) {
                        _this.restore();
                    }
                });
            } else {
                _this.restore();
                localStorage.setItem('player_init', 1);
                $.post('/import/backup/', {uid: this.uid}, function (result) { console.log(result); });
            }
        } else {
            console.log('This uid already restored');
            $.post('/import/backup/', {uid: this.uid}, function (result) {
                console.log(result);
            });
        }
    },

    restore: function () {
        const _this = this;

        $.get('/import/restore/', {uid: this.uid}, function (result) {
            _this.setCurrentData(result)
            _this.setIsRestored()
            // location.replace()
        });
    },

    setCurrentData: function (data = {}) {
        // if (data == undefined) data = {};

        this.getFields().forEach(function (param) {
            if (data[param] !== undefined)
                localStorage.setItem(param, data[param])
            else
                localStorage.removeItem(param);
        })
    },

    getCurrentData: function () {
        const data = {};

        this.getFields().forEach(function (param) {
            data[param] = localStorage.getItem(param)
        })

        return data;
    },

    getFields: function () {
        const levels = ['easy', 'medium', 'hard', 'expert', 'guru'];

        return [
            'user_rang',
            'total_score',

            'easy_last_completed_level',
            'easy_current_level',
            'easy_current_board',
            'easy_current_notes',
            'easy_current_score',
            'easy_current_errors',
            'easy_current_time',
            'easy_current_hints',

            'medium_last_completed_level',
            'medium_current_level',
            'medium_current_board',
            'medium_current_notes',
            'medium_current_score',
            'medium_current_errors',
            'medium_current_time',
            'medium_current_hints',

            'hard_last_completed_level',
            'hard_current_level',
            'hard_current_board',
            'hard_current_notes',
            'hard_current_score',
            'hard_current_errors',
            'hard_current_time',
            'hard_current_hints',

            'expert_last_completed_level',
            'expert_current_level',
            'expert_current_board',
            'expert_current_score',
            'expert_current_notes',
            'expert_current_errors',
            'expert_current_time',
            'expert_current_hints',

            'guru_last_completed_level',
            'guru_current_level',
            'guru_current_board',
            'guru_current_notes',
            'guru_current_score',
            'guru_current_errors',
            'guru_current_time',
            'guru_current_hints',
        ];
    }
};

SudokuApp.write = function () {
    // console.log('Write...')
    // Cookies.set('test', 111, {domain: '.sudoku-app.local'});
}

