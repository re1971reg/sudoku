//
// ЭТОТ СКРИПТ ИСПОЛЬЗУЕТСЯ В НОВОЙ ВЕРСИИ ИГРЫ
//
const DEBUG_ON = true;

const consoleDebug = {
	log: function () {
		if (DEBUG_ON)
			console.log(...arguments)
	}
};

let currentLevel;

function Sudoku(params) {
	this.userHash = params.userHash || '';
	this.keyPrefix = params.keyPrefix || 'daily';
	this.targetSaveKey = params.targetSaveKey || false;
	this.currentLevel = params.currentLevel || 0;

	this.INIT = 0;
	this.RUNNING = 1;
	this.END = 2;
	this.PAUSE = 3;

	this.idBoardEl = params.idBoardEl || 'sudoku_container';
	this.idConsoleEl = params.idConsoleEl || 'sudoku_console';
	this.idStatEl = params.idStatEl || 'sudoku_stats';
	this.id4 = params.id4 || 'game_container';

	this.displaySolution = params.displaySolution || 0;
	this.displaySolutionOnly = params.displaySolutionOnly || 0;
	this.displayTitle = params.displayTitle || 0;
	this.highlight = params.highlight || 0;
	this.fixCellsNr = params.fixCellsNr || 32;
	this.n = 3;
	this.nn = this.n * this.n;
	this.cellsNr = this.nn * this.nn;
	this.retryRewardTime = 40;

	if (this.fixCellsNr < 10) this.fixCellsNr = 10;
	if (this.fixCellsNr > 70) this.fixCellsNr = 70;

	this.dbRenewTime = 60;
	this.remoteLastSync = this.getLocal('lastSync');

	this.remoteData = {};
	this.remoteUpdateAt = 0;

	const t = this;

	this.gameModal = new bootstrap.Modal('#gameModal');

	this.loadProfile(function (result) {
		consoleDebug.log('[PROFILE] result for callback ', result)
		consoleDebug.log('[PROFILE] timers', t.remoteLastSync, t.remoteUpdateAt)

		if (t.remoteLastSync === null || Math.abs(parseInt(t.remoteLastSync) - parseInt(t.remoteUpdateAt)) > 3) {
			consoleDebug.log('[PROFILE] restore from remote', t.remoteLastSync, t.remoteUpdateAt)

			if (t.restoreProfile()) {
				t.updateLastSync(t.remoteUpdateAt)

				consoleDebug.log('[PROFILE] Reload page...')
				if (DEBUG_ON) {
					consoleDebug.log('wait 1sec')
					setTimeout(function () {
						location.reload()
					}, 1000)
				} else {
					location.reload()
				}
			}
		}
	});

	t.init(params.board, params.solution, params.freecells);

	//counter
	setInterval(function () {
		t.timer();
	}, 1000);

	$('#admin_debug_win').click(function () {
		t.gameOver('win')
	})
	$('#admin_debug_lose').click(function () {
		t.gameOver('lose')
	})

	return this;
}

Sudoku.prototype.yaGoal = function (name) {
	ym(91807948, 'reachGoal', name);
}

Sudoku.prototype.debug = function () {
	console.log(arguments);
};

Sudoku.prototype.getSetting = function (name, defaultVal) {
	const value = localStorage.getItem(name);

	return value || defaultVal
};

Sudoku.prototype.setSetting = function (name, value) {
	localStorage.setItem(name, value);
}

Sudoku.prototype.save = function (key, data) {
	// TODO
	// this.saveLocal(key, data)
	// this.saveRemote(key, data)
}

Sudoku.prototype.saveProfile = function (isAllData)
{
	// if (!isAllData)
	// 	isAllData = true

	const _this = this;

	const data = {
		easy: this.getLocal('easy'),
		medium: this.getLocal('medium'),
		hard: this.getLocal('hard'),
		expert: this.getLocal('expert'),
		guru: this.getLocal('guru'),
		userRang: this.getLocal('userRang'),
		totalScore: this.getLocal('totalScore'),
		currentHints: this.getLocal('currentHints'),
	}

	consoleDebug.log('[PROFILE] Save:', data)
	this.requestSave({key: 'profile', data: JSON.stringify(data)}, function (result) {
		console.log('[PROFILE] save:', result, _this.getNow())
		_this.updateLastSync(result.updatedAt)
	});
}

Sudoku.prototype.loadProfile = function (callback)
{
	consoleDebug.log('[PROFILE] - Load')

	const _this = this;

	$.get('/api/user/game/', function (result) {
		consoleDebug.log('[PROFILE] - Load request', result.success)

		if (result.success) {
			_this.remoteData = result.data;
			_this.remoteUpdateAt = result.updatedAt;

			consoleDebug.log('[PROFILE] - Loaded', result.updatedAt)

			if (typeof callback === 'function') {
				callback(result);
			}
		} else {
			console.log('[PROFILE] - success=0')
			_this.saveProfile()
		}
	});
}

Sudoku.prototype.restoreProfile = function (callback) {
	// TODO замена локальных данных из БД
	this.saveLocal('easy', this.remoteData.easy)
	this.saveLocal('medium', this.remoteData.medium)
	this.saveLocal('hard', this.remoteData.hard)
	this.saveLocal('expert', this.remoteData.expert)
	this.saveLocal('guru', this.remoteData.guru)
	this.saveLocal('userRang', this.remoteData.userRang)
	this.saveLocal('totalScore', this.remoteData.totalScore)
	this.saveLocal('currentHints', this.remoteData.currentHints)

	if (typeof callback === 'function') {
		// TODO ???
	}

	return true;
}

Sudoku.prototype.updateLastSync = function (ts) {
	if (typeof ts === 'undefined')
		ts = this.getNow();

	this.remoteLastSync = ts
	this.saveLocal('lastSync', ts)
}

Sudoku.prototype.saveLocal = function (key, data, prefix) {
	if (prefix !== undefined)
		key = prefix +'_'+ key;

	if ((prefix === undefined || prefix === 'daily') && this.userHash.length > 0) {
		key = this.userHash + '_' + key
	}

	// consoleDebug.log('method: saveLocal')
	consoleDebug.log('[SET] Key: ', key, 'Value: ', data) //, 'Parent: ', prefix

	// TODO save old values?
	// let oldValue = this.getSetting('daily');
	// oldValue[20240719] = {}

	if (typeof data !== 'string') {
		data = JSON.stringify(data)
	}

	this.setSetting(key, data);
}

Sudoku.prototype.getLocal = function (key, prefix, defaultValue, params) {
	if (defaultValue === undefined)
		defaultValue = null;

	if (prefix !== undefined) {
		key = prefix +'_'+ key;
	}

	if ((prefix === undefined || prefix === 'daily') && this.userHash && this.userHash.length > 0) {
		key = this.userHash + '_' + key
	}

	consoleDebug.log('[GET] Key: ', key);
	const value = this.getSetting(key);

	if (typeof value !== 'string') {
		return defaultValue;
	}

	try {
		return JSON.parse(value);
	} catch (e) {
		return value;
	}
}

Sudoku.prototype.setLocalParam = function (params, key, prefix) {
	const gameData = this.getLocal(key, prefix)

	for (let paramName in params) {
		gameData[paramName] = params[paramName];
	}

	this.saveLocal(key, gameData, prefix)
}

Sudoku.prototype.getLocalParam = function (param, key, prefix) {
	const gameData = this.getLocal(key, prefix)

	console.log('gameData: ', gameData)
	if (gameData !== undefined && gameData !== null && gameData[param] !== undefined)
		return gameData[param]

	return null;
}

Sudoku.prototype.saveLocalGroupLegacy = function (data, prefix) {
	for (let key in data) {
		const value = data[key];

		if (prefix !== undefined)
			key = prefix +'_'+ key;

		this.saveLocal(key, value)
	}
}

Sudoku.prototype.saveCurrentGame = function ()
{
	this.saveRemote(this.targetSaveKey, this.gameData());
}

Sudoku.prototype.saveRemote = function (key, data) {
	const _this = this;
	consoleDebug.log('Last remote save at: ', this.remoteLastSync)

	if (this.remoteLastSync + this.dbRenewTime <= this.getNow()) {
		consoleDebug.log('Save to DB...', this.getNow())

		this.updateLastSync();

		this.requestSave({key: this.targetSaveKey, data: JSON.stringify(data)}, function (result) {
			console.log('[SAVE] after:', result)
			_this.updateLastSync(_this.remoteUpdateAt = result.updatedAt)
		})
	}
}

Sudoku.prototype.requestSave = function (data, callback) {
	/*if (data.totalScore !== undefined) {
		$.post('/api/user/save/', data, callback)
	} else */

	if (this.targetSaveKey === 'daily') {
		// $.post('/api/daily/save/', data, callback)
	} else {
		$.post('/api/user/save-game/', data, callback)
	}
}

Sudoku.prototype.gameData = function () {
	// let state = this.blankGameData();
	// state.time = this.secondsElapsed

	if(this.keyPrefix === 'daily'){
		return {
			board: this.currentBoard,
			notes: this.currentNotes,
			score: parseInt(this.gameStats),
			errors: parseInt(this.mistakes),
			time: this.secondsElapsed,
			level: this.currentLevel,
			last_completed_level: this.getLocalParam('last_completed_level', this.targetSaveKey, this.keyPrefix),
			level_difficulty: difficulty
		}
	}
	else{
		return {
			board: this.currentBoard,
			notes: this.currentNotes,
			score: parseInt(this.gameStats),
			errors: parseInt(this.mistakes),
			time: this.secondsElapsed,
			level: this.currentLevel,
			last_completed_level: this.getLocalParam('last_completed_level', this.targetSaveKey, this.keyPrefix)
		}
	}

}

Sudoku.prototype.init = function(_board, _solution, _freecells)
{
	consoleDebug.log('Init...')

	// проверяем была ли смена сложности у дэйлика
	if(this.keyPrefix === 'daily'){

		let daily_difficulty =  this.getLocalParam('level_difficulty', this.targetSaveKey, this.keyPrefix);
		//console.log('%c[DAILY INIT] Daily Difficulty: '+ daily_difficulty, 'color:red');

		if(daily_difficulty !== null && daily_difficulty !== difficulty){
			console.log('%c[DAILY INIT] DIFFICULTY NOT SAME', 'color:red', daily_difficulty);
			this.restart(this);
		}

	}

	this.status = this.INIT;
	this.cell = null;
	this.markNotes = 0;
	this.secondsElapsed = 0;
	this.mistakes = 0;
	this.maxMistakes = 3;
	this.hintsCounter = 3;
	this.gameStats = 0;

	if (this.displayTitle === 0) {
		$('#sudoku_title').hide();
	}

	this.board = _board;
	this.boardSolution = _solution;
	this.cellsComplete = _freecells;

	/* грузим local сэйв */
	if (this.targetSaveKey) {
		const isDaily = this.keyPrefix !== 'daily';
		const gameData = this.getLocal(this.targetSaveKey, this.keyPrefix) || this.blankGameData(isDaily);

		consoleDebug.log('gameData: ', gameData);
		consoleDebug.log('_board: ', _board);

		this.currentBoard = gameData.board && gameData.board.length > 0 ? gameData.board : _board;
		this.secondsElapsed = gameData.time;
		this.gameStats = gameData.score;
		this.mistakes = gameData.errors;
		this.currentNotes = gameData.notes;
	} else {
		// const _savedBoard = JSON.parse(localStorage.getItem(difficulty + '_current_board')),
		// 	_savedTime = localStorage.getItem(difficulty + '_current_time'),
		// 	_savedScore = parseInt(localStorage.getItem(difficulty + '_current_score')),
		// 	_savedErrors = localStorage.getItem(difficulty + '_current_errors'),
		// 	_savedNotes = JSON.parse(localStorage.getItem(difficulty + '_current_notes'));
		//
		// this.currentBoard = _savedBoard !== 0 ? _savedBoard : _board;
		// this.secondsElapsed = _savedTime > 0 ? _savedTime : 0;
		// this.gameStats = _savedScore !== 0 ? _savedScore : 0;
		// this.mistakes = _savedErrors > 0 ? _savedErrors : 0;
		// this.currentNotes = _savedNotes !== 0 ? _savedNotes : [];
	}

	const savedHints = this.getLocal('currentHints', this.userHash);
	// console.log(savedHints)

	/*if (!savedHints) {
		this.hintsCounter = 3;
	} else */
	if (savedHints >= 0) {
		this.hintsCounter = savedHints;
	}

	// this.hintsCounter = savedHints > 0 ? savedHints : 0;
	// если меньше 3 и больше 0

	if (this.mistakes >= this.maxMistakes) {
		this.maxMistakes = parseInt(this.mistakes) + 1;
	}

	return this;
};

Sudoku.prototype.timer = function() {
	if (this.status === this.RUNNING) {
		this.secondsElapsed++;
		
		function num(val){
			val = Math.floor(val);
			return val < 10 ? '0' + val : val;
		}
				
		var sec = this.secondsElapsed;
		var hours = sec / 3600  % 24;
		var minutes = sec / 60 % 60
		var seconds = sec % 60

		$('.time').text( num(hours) + ':' + num(minutes) + ':' + num(seconds) );

		if (this.secondsElapsed % this.dbRenewTime === 0) {
			consoleDebug.log('[DB] saveKey:', this.targetSaveKey, 'keyPrefix:', this.keyPrefix, 'user:', this.userHash)

			if (this.keyPrefix !== 'daily')
				this.saveRemote(this.targetSaveKey, this.gameData());
		}
	}
};

/**
Draw sudoku board in the specified container
*/
Sudoku.prototype.drawBoard = function(){
	let index = 0,
		position = {x: 0, y: 0},
		group_position = {x: 0, y: 0};

	const sudoku_board = $('<div class="sudoku_board d-flex flex-wrap"></div>');
	const sudoku_statistics = $('<div></div>').addClass('statistics').html(
		'<b>' + lang.get('board_score') + ':</b> <span class="gamestats">' + this.gameStats + '</span> - <b>'
		+ lang.get('board_mistakes') + ':</b> <span class="mistakes">' + this.mistakes + '/'+ this.maxMistakes +'</span> - <b>' + lang.get('board_cells')
		+ ':</b> <span class="cells_complete">' + this.cellsComplete + '/' + this.cellsNr + '</span> - <b>' + lang.get('board_time')
		+ ':</b> <span class="time">00:00:00</span> <span id="pause" data-bs-toggle="modal" data-bs-target="#settingsModal"><img src="/images/icons/pause.png" alt="Pause Game"></span>'
	);

	// console.log(this.board)
	// console.log(this.boardSolution)

	//draw board
	for (let i = 0; i < this.nn; i++) {
		for (let j = 0; j < this.nn; j++) {
			position = {x: i + 1, y: j + 1};
			group_position = {x: Math.floor((position.x - 1) / this.n), y: Math.floor((position.y - 1) / this.n)};

			var user_value = this.currentBoard[index];

			const value = this.board[index] > 0 ? this.board[index] : '',
				value_solution = this.boardSolution[index] > 0 ? this.boardSolution[index] : '',
				cell = $('<div></div>').addClass('cell').attr('id', index + 1).attr('x', position.x).attr('y', position.y)
					.attr('gr', group_position.x + '' + group_position.y)
					.html('<span>' + (user_value > value ? user_value : value) + '</span>');

			//if (user_value != value) cell = $

			if (this.displaySolution) {
				$('<span class="solution">(' + value_solution + ')</span>').appendTo(cell);
			}

			// add table for notes
			if (value === 0 || user_value === 0) {

				// выбираем заметки из ячеек
				var _currentNotes = $.grep(this.currentNotes, function (val) {
					return val.indexOf('c' + (index + 1) + ':') > -1 ? val : '';
				});
				var _htmlNotes = [];

				// грузим заметки из сохранения
				if (_currentNotes.length > 0) {
					_currentNotes.sort();
					//console.log('_currentNotes: ' + _currentNotes);

					for (n = 0; n < _currentNotes.length; n++) {
						_currentNotes[n] = _currentNotes[n].replace('c' + (index + 1) + ':', '');
						//console.log(_currentNotes[n]);
					}

					var _noteIndex = 0;

					for (n = 0; n < 3; n++) {
						_htmlNotes += '<tr>';

						for (m = 0; m < 3; m++) {
							if (_currentNotes[_noteIndex] == (m + n * 3 + 1)) {
								_htmlNotes += '<td id="' + (m + n * 3 + 1) + '"><div class="note">' + _currentNotes[_noteIndex] + '</div></td>';
								//console.log('[currenNote]: '+_currentNotes[_noteIndex] );
								_noteIndex++;
							} else {
								_htmlNotes += '<td id="' + (m + n * 3 + 1) + '"></td>';
								//console.log('[_noteIndex-1]: none'); 
							}
						}
						_htmlNotes += '</tr>';
					}
					$('<table class="fornotes">' + _htmlNotes + '</table>').appendTo(cell);
				} else {
					$('<table class="fornotes"><tr><td id="1"></td><td id="2"></td><td id="3"></td></tr><tr><td id="4"></td><td id="5"></td><td id="6"></td></tr><tr><td id="7"></td><td id="8"></td><td id="9"></td></tr></table>').appendTo(cell);
				}
			}

			if (value > 0) {
				cell.addClass('fix');
			}

			if (position.x % this.n === 0 && position.x != this.nn) {
				cell.addClass('border_h');
			}

			if (position.y % this.n === 0 && position.y != this.nn) {
				cell.addClass('border_v');
			}

			cell.appendTo(sudoku_board);
			index++;
		}
	}

	$('#' + this.idBoardEl).empty().append(sudoku_board);
	// sudoku_board.appendTo('#' + this.idBoardEl);

	//draw console
	// var sudoku_console_cotainer = $('<div></div>').addClass('board_console_container');
	// var sudoku_console_elements = $('<div></div>').addClass('board_console_elements');
	// var sudoku_console = $('<div></div>').addClass('board_console');

	//$('<div></div>').addClass('num undo').text('Undo').appendTo(sudoku_console_elements);
	// $('<div></div>').addClass('num remove').html('<img src="/images/erase.png">' + lang.get('button_delete')).appendTo(sudoku_console_elements);
	// $('<div></div>').addClass('num note').html('<img src="/images/pencil.png">' + lang.get('button_notes')).appendTo(sudoku_console_elements);
	// let hintDiv = $('<div class="num hint" id="hint-btn"></div>');

	const hintBtn = $('#hint-btn');

	if (this.hintsCounter > 0) {
		hintBtn.find('span').text(lang.get('button_hints') + ' (' + this.hintsCounter + ')');
		// hintDiv.html('<img src="/images/hint.png"><span>' + lang.get('button_hints') + ' (' + this.hintsCounter + ')</span>');//.appendTo(sudoku_console_elements);
	} else {
		hintBtn.find('span').text(lang.get('button_no_hints'));
		// hintDiv.html('<img src="/images/hint.png"><span>' + lang.get('button_no_hints')+'</span>');
	}

	// hintDiv.append([
	// 		$('<a class="gift-hint"></a>'),
			// $('<div id="hint-reward-timer" class="hint-reward-timer"></div>')
	// ]);
	// hintDiv.appendTo(sudoku_console_elements)

	// for (i = 1; i <= this.nn; i++) {
	// 	$('<div></div>').addClass('num digit').text(i).appendTo(sudoku_console);
	// }

	//draw gameover
	var sudoku_gameover = $('<div class="gameover_container" style=""><div class="gameover"></div></div>');

	//add all to sudoku container
	$('#' + this.idStatEl).empty().append(sudoku_statistics)
	// sudoku_console_cotainer.appendTo('#' + this.idConsoleEl);
	// sudoku_console_elements.appendTo(sudoku_console_cotainer);
	// sudoku_console.appendTo(sudoku_console_cotainer);
	sudoku_gameover.appendTo('#game_modal_body'); // + this.id4);

	const lastRewardAt = this.getSetting('lastRewardAt');


	if (this.allowShowReward()) {
		if (this.hintsCounter === 0)
			hintBtn.addClass('show-reward');
	} else if (lastRewardAt) {
		this.startRewardTimer()
		// this.renderHintRewardTimer()
	}

	//adjust size
	this.resizeWindow();
};

Sudoku.prototype.resizeWindow = function(){
    console.time("resizeWindow");
    
    const screen = { w: $('#'+ this.idBoardEl).width(), h: $(window).height() };
    
    //adjust the board
    var b_pos = $('#'+ this.idBoardEl +' .sudoku_board').offset(),
        b_dim = { w: $('#'+ this.idBoardEl +' .sudoku_board').width(),  h: $('#'+ this.idBoardEl +' .sudoku_board').height() },
        s_dim = { w: $('#'+ this.idBoardEl +' .statistics').width(),    h: $('#'+ this.idBoardEl +' .statistics').height()   };
    
    var cell_width = $('#'+ this.idBoardEl +' .sudoku_board .cell:first').width(),
        note_with  = Math.floor(cell_width/3) -1;
  
    // $('#'+ this.idBoardEl +' .sudoku_board .cell').height(cell_width);
    $('#'+ this.idBoardEl +' .sudoku_board .cell span').css('line-height', cell_width+'px');
    $('#'+ this.idBoardEl +' .sudoku_board .cell .note').css({'line-height': note_with+'px' ,'width' : note_with, 'height': note_with});
    
    //adjust the console
    var console_cell_width = $('#'+ this.idConsoleEl +' .board_console .num:first').width();
    $('#'+ this.idConsoleEl +' .board_console .num');
    $('#'+ this.idConsoleEl +' .board_console .num');
    
    //adjust console
    b_pos = $('#'+ this.idBoardEl +' .sudoku_board').offset();
    $('#'+ this.idConsoleEl +' .board_console');
    
    // console.log('screen', screen);
    console.timeEnd("resizeWindow");
};

/**
Show console - отрисовываем цифровую панель
*/
Sudoku.prototype.showConsole = function(cell) {
  $('#'+ this.idConsoleEl +' .board_console_container').show();
  
  var 
    t = this,
    oldNotes = $(this.cell).find('.note');
  
  //init
  $('#'+ t.idConsoleEl +' .board_console .num').removeClass('selected');
    
  //mark buttons
  if(t.markNotes) {
    //select markNote button  
    $('#'+ t.idConsoleEl +' .board_console .num.note').addClass('selected');
  
    //select buttons
    $.each(oldNotes, function() {
      var noteNum = $(this).text();
      $('#'+ t.idConsoleEl +' .board_console .num:contains('+ noteNum +')').addClass('selected');
    });  
  }
  
  return this;
};

/**
Hide console - старая и ненужная функция
*/
Sudoku.prototype.hideConsole = function(cell) {
  //$('#'+ this.id2 +' .board_console_container').hide();
  return this;
};

/**
Select cell and prepare it for input from sudoku board console
*/
Sudoku.prototype.cellSelect = function(cell){    
    this.cell = cell;
    
    var value = $(cell).text() | 0,
        position       = { x: $(cell).attr('x'), y: $(cell).attr('y') } ,
        group_position = { x: Math.floor((position.x -1)/3), y: Math.floor((position.y-1)/3) },
        horizontal_cells = $('#'+ this.idBoardEl +' .sudoku_board .cell[x="'+ position.x +'"]'),
        vertical_cells   = $('#'+ this.idBoardEl +' .sudoku_board .cell[y="'+ position.y +'"]'),
        group_cells      = $('#'+ this.idBoardEl +' .sudoku_board .cell[gr="'+ group_position.x +''+ group_position.y +'"]'),
        same_value_cells = $('#'+ this.idBoardEl +' .sudoku_board .cell span:contains('+value+')'),
		same_value_notes = $('#'+ this.idBoardEl +' .sudoku_board .cell .note:contains('+value+')');
    
    //remove all other selections
    $('#'+ this.idBoardEl +' .sudoku_board .cell').removeClass('selected current group');
    $('#'+ this.idBoardEl +' .sudoku_board .cell span').removeClass('samevalue');
	$('#'+ this.idBoardEl +' .sudoku_board .cell div').removeClass('samevalue');
    //select current cell
    $(cell).addClass('selected current');
    
    //highlight select cells
	//if (this.highlight > 0) {
	if(this.getLocalParam('highlight_areas','settings', userHash)) {
        horizontal_cells.addClass('selected');
        vertical_cells.addClass('selected');
        group_cells.addClass('selected group');
    }
	if(this.getLocalParam('highlight_same','settings', userHash)) {
		same_value_cells.not($(cell).find('span')).addClass('samevalue');
		same_value_notes.not($(cell).find('div')).addClass('samevalue');
	}
    
    if ($( this.cell ).hasClass('fix')) {
        $('#'+ this.idConsoleEl +' .board_console .num').addClass('no');
    } else {
        $('#'+ this.idConsoleEl +' .board_console .num').removeClass('no');
        
        this.showConsole();
        this.resizeWindow();
    }    
};

/**
Add value from sudoku console to selected board cell
*/
Sudoku.prototype.addValue = function(value) {
	console.log('prepare for addValue', value);
	console.log(this.status);

	if (this.status !== this.RUNNING)
		return ;

	var position = {x: $(this.cell).attr('x'), y: $(this.cell).attr('y')},
		group_position = {x: Math.floor((position.x - 1) / 3), y: Math.floor((position.y - 1) / 3)},

		horizontal_cells = '#' + this.idBoardEl + ' .sudoku_board .cell[x="' + position.x + '"]',
		vertical_cells = '#' + this.idBoardEl + ' .sudoku_board .cell[y="' + position.y + '"]',
		group_cells = '#' + this.idBoardEl + ' .sudoku_board .cell[gr="' + group_position.x + '' + group_position.y + '"]',

		horizontal_cells_exists = $(horizontal_cells + ' span:contains(' + value + ')'),
		vertical_cells_exists = $(vertical_cells + ' span:contains(' + value + ')'),
		group_cells_exists = $(group_cells + ' span:contains(' + value + ')'),

		horizontal_notes = horizontal_cells + ' .note:contains(' + value + ')',
		vertical_notes = vertical_cells + ' .note:contains(' + value + ')',
		group_notes = group_cells + ' .note:contains(' + value + ')',

		old_value = parseInt($(this.cell).not('.notvalid').text()) || 0;

	var cell_index = this.getCellIndex();
	var right_cell_value = this.boardSolution[cell_index - 1];

	if ($(this.cell).hasClass('fix')) {
		return;
	}

	if(old_value > 0 && value >= 0 && !this.markNotes) {
		//console.log('CHECK DELETED VALUE: ' + old_value);
		this.gameStats -= 10;
		//console.log('[CHECK NOTES]: MINUS');
		$('.gamestats').text(this.gameStats);
		// считаем кол-во правильных значений в массиве
		let check_deleted_numbers = this.currentBoard.reduce((acc, n) => n === parseInt(old_value) ? acc + 1 : acc, 0) - 1;
		//console.log('[CHECK DELETE '+ old_value + ']: ' + check_deleted_numbers);

		// если их 9, то отключаем кнопку с цифрой
		if(check_deleted_numbers < 9) {
			$('#digit_'+old_value).removeClass('disabled');
		}
	}

	// удаляем или добавляем значение в клетку
	$(this.cell).find('span').text((value === 0) ? '' : value);

	// проверяем на ошибки - если клетка заполнена и не равна правильному значению
	if (this.cell !== null && (((value > 0) && (value !== right_cell_value)) || horizontal_cells_exists.length || vertical_cells_exists.length || group_cells_exists.length)) {
		if (old_value !== value) {
			// если активирован учёт ошибок - фиксируем ошибку
			if(this.getLocalParam('count_mistakes','settings', userHash)) {
				// меняем оформление
				$(this.cell).addClass('notvalid');

				this.mistakes++; // фиксируем ошибку
				this.gameStats -= 20; // минусуем статистику

				$('.mistakes').text(this.mistakes + '/' + this.maxMistakes);
				$('.gamestats').text(this.gameStats);
			}

			// подсветка дублей
			if(this.getLocalParam('highlight_duplicates','settings', userHash)) {
				if (horizontal_cells_exists.length || vertical_cells_exists.length || group_cells_exists.length) {
					$(this.cell).addClass('notvalid');
				}
			}

			if (this.mistakes >= this.maxMistakes) {
				this.gameOver('lose');
				// return
			}
		} else {
			if(value === old_value){
				$(this.cell).find('span').text('');
				//console.log('[CHECK NOTES]: MINUS WHEN SAME');
			}
			else {
				$(this.cell).find('span').text('');
				// боремся с накруткой
				this.gameStats -= 10;
				//console.log('[CHECK NOTES]: MINUS WHEN 0');
			}
			$('.gamestats').text(this.gameStats);
		}
	} else {
		//add value
		$(this.cell).removeClass('notvalid');
		console.log('Value added ', value);

		if (value !== 0) {
			this.gameStats += 10;
			$('.gamestats').text(this.gameStats);

			// считаем кол-во правильных значений в массиве
			let check_numbers = this.currentBoard.reduce((acc, n) => n === value ? acc + 1 : acc, 0) + 1;
			//console.log('[CHECK ADD '+ value + ']: ' + check_numbers);

			// если их 9, то отключаем кнопку с цифрой
			if(check_numbers > 8 && this.getLocalParam('hide_buttons','settings', userHash))  {
				$('#digit_'+value).addClass('disabled');
			}
		}

		// удаляем заметки из текущей клетки, строки, колонки
		if (value > 0) {
			// если активирована настройка - удаляем
			if(this.getLocalParam('remove_notes','settings', userHash)) {
				var cell_id = [];

				$(horizontal_cells).each(function () {
					cell_id.push($(this).attr('id'));
					//console.log(cell_id);
				});
				$(vertical_cells).each(function () {
					cell_id.push($(this).attr('id'));
					//console.log(cell_id);
				});
				$(group_cells).each(function () {
					cell_id.push($(this).attr('id'));
					//console.log(cell_id);
				});

				for (i = 0; i < cell_id.length; i++) {
					this.removeNote2(value, cell_id[i]);
				}

				$(horizontal_notes).remove();
				$(vertical_notes).remove();
				$(group_notes).remove();
			}
		}
	}

	//recalculate completed cells
	this.cellsComplete = $('#' + this.idBoardEl + ' .sudoku_board .cell:not(.notvalid) span:not(:empty)').length;
	console.log('is game over? ', this.cellsComplete, this.cellsNr, (this.cellsComplete === this.cellsNr));

	//game over
	if (this.cellsComplete === this.cellsNr) {
		this.currentBoard[cell_index - 1] = value;
		//console.log('[CHECK SOLUTION]: ' + this.currentBoard);

		// сравниваем текущий массив значений с решением
		if(JSON.stringify(this.currentBoard) != JSON.stringify(this.boardSolution)) {
			console.log('[CHECK SOLUTION]: WRONG SOLUTION!');

			if(!this.getLocalParam('count_mistakes','settings', userHash)) {
				this.gameOver('lose');
			}
			/*
			else {
				console.log('[CHECK SOLUTION]: WRONG SOLUTION, LAST MISTAKE!');
			}
			*/
		}
		else {
			console.log('[CHECK SOLUTION]: RIGHT SOLUTION!');
			this.gameOver('win');
		}
	}

	/*
	if (this.cellsComplete === this.cellsNr) {
		this.gameOver('win');
	}
	*/

	$('.cells_complete').text('' + this.cellsComplete + '/' + this.cellsNr);

	/* добавляем последнее введённое значение */
	this.currentBoard[cell_index - 1] = value;
	/* запускаем автосохранение */
	this.autosave();

	return this;
};

/** 
Получаем индекс клетки/ячейки
*/
Sudoku.prototype.getCellIndex = function() {

	var cell_x = parseInt($(this.cell).attr('x'));
	var cell_y = parseInt($(this.cell).attr('y'));
	var cell_index = (cell_x-1)*9 + cell_y; 
	console.log('Cell index: ' + cell_index + ' Cell value: ' + this.boardSolution[cell_index-1]);
	
	return cell_index; 
}

/**
Show Hint - показываем подсказку для пустой ячейки
*/
Sudoku.prototype.showHint = function(){

	if (this.cell !== null && this.hintsCounter > 0 && !$(this.cell).hasClass('fix')) {
		var cell_index = this.getCellIndex();
		this.removeNote(0).addValue(this.boardSolution[cell_index - 1]);
		this.hintsCounter--;

		if (this.hintsCounter === 0) {
			$('#hint-btn span').text(lang.get('button_no_hints'));

			const lastRewardAt = this.getSetting('lastRewardAt', this.getNow());


			if (this.allowShowReward()) {
				$('#hint-btn').addClass('show-reward')
			} else if (lastRewardAt) {
				this.startRewardTimer(lastRewardAt)
			}

			this.yaGoal('no_hints')
		} else {
			$('#hint-btn span').text(lang.get('button_hints') + ' (' + this.hintsCounter + ')');
		}

		this.gameStats -= 30;
		$('.gamestats').text(this.gameStats);

		this.yaGoal('hint')

		this.autosave();
		this.saveProfile();
		this.showConsole();
	} else if (this.hintsCounter === 0) {
		this.showReward();
	}
	
};

/**
Add note from sudoku console to selected board cell
*/
Sudoku.prototype.addNote = function(value) {
	$(this.cell).find('#'+value).html('<div class="note">'+value+'</div>');
	console.log('addNote', value);
	
	/* TODO save notes */
	var cell_index = this.getCellIndex();
	this.currentNotes.push('c'+cell_index+':'+value); 
	//this.currentBoard[cell_index-1].push = value;
	this.autosave(); 
	
	return this;
};

/**
Remove note from sudoku console to selected board cell
*/
Sudoku.prototype.removeNote = function(value) {
	
	var cell_index = this.getCellIndex();
		
	if (value === 0) {    
		$(this.cell).find('.note').remove();
		// удаляем все заметки из текущей ячейки
		this.currentNotes = $.grep( this.currentNotes, function(val) { 
										return val.indexOf('c'+cell_index+':') === -1 ? val : '';
									});
		this.autosave();
		//console.log('delete 1');
	} else {    
		$(this.cell).find('.note:contains('+value+')').remove();
		// удаляем заметку с текущим значением
		this.currentNotes = $.grep( this.currentNotes, function(val) { 
										return val != 'c'+cell_index+':'+value; 
									});
		this.autosave();
		//console.log('delete 2 ' + 'c'+cell_index+':'+value);
	}

	return this;
};

//function removeNote2(value, cell_id) {
Sudoku.prototype.removeNote2 = function(value, cell_id) {
	if(cell_id) {
		
		//console.log('TRY TO DELETE NOTE: ' + value + ' IN CELL: ' + cell_id);
		this.currentNotes = jQuery.grep( this.currentNotes, function(val) { 
										//console.log('c'+cell_id+':'+value);
										return val != 'c'+cell_id+':'+value; 
									}); 	
	}
};

/**
End game routine
*/
Sudoku.prototype.gameOver = function(value){
	console.log('gameOver: ', value);

	const _this = this;

	let totalScore = this.getLocal('totalScore', this.userHash); //console.log('totalScore: ', totalScore)

	const $gameOverContainer = $('#' + this.id4).find('.gameover_container'),
		$gameOverDiv = $('.gameover');

	if (value === 'win') {
		console.log('WIN!');
		this.yaGoal('win');

		// Начисление очков - проверка на накрутку
		if (parseInt(this.gameStats) > 640) {
			totalScore += 640;
		} else {
			totalScore += parseInt(this.gameStats); //console.log('totalScore: ', totalScore)
		}
		this.saveLocal('totalScore', totalScore, this.userHash);

		this.status = this.END;

		if (this.keyPrefix === 'daily') {

			console.log('[DAILY] WIN!')
			// плюсуем счётчик побед в зависимости от сложности
			let levelsWins = _this.getLocalParam('last_completed_level', difficulty, _this.userHash);
			_this.setLocalParam({ last_completed_level: levelsWins + 1}, difficulty, _this.userHash)

			$.post('/api/daily/save/', {key: this.targetSaveKey, state: 'win'}, function (result) {
				if (result.cupIsWin) {
					// выигран кубок
					console.log('[DAILY] CUP WIN!')
					_this.gameModalTitle('win_label');
					_this.gameModalBodyClean(); // чистим модалку от кнопок
					if (result.cupImg) {
						$('#gameModal_Body').append(
							'<p class="text-center">' + lang.get('cup_is_win') + '<br>'+
							'<img src="'+ result.cupImg +'" class="img-fluid" /></p>'
						);
					}
					$('#gameModal_Body').append(
						'<hr/>' +
						'<p>' + lang.get('gameover_score') + ': ' + _this.gameStats + ' ' + lang.get('points') + '</p>'+
						'<p>' + lang.get('gameover_total_score') + ': ' + totalScore + '</p>'
					);

					_this.gameModalButton('new_game', 'to_daily_page', 'restart btn-primary blue_color', backUrl)
					_this.gameModal.show();
				}
				else {
					// выиграна ежедневная игра
					_this.gameModalTitle('win_label');
					_this.gameModalBodyClean(); // чистим модалку от кнопок
					$('#gameModal_Body').append(
						'<p>' + lang.get('gameover_score') + ': ' + _this.gameStats + ' ' + lang.get('points') + '</p>'+
						'<p>' + lang.get('gameover_total_score') + ': ' + totalScore + '</p>'
					);
					_this.gameModalButton('new_game', 'to_daily_page', 'restart btn-primary blue_color', backUrl)
					_this.gameModal.show();
				}
			});
		}
		else {
			// INCREASE WINS COUNTER
			let levelsWins = this.getLocalParam('last_completed_level', this.targetSaveKey, this.keyPrefix);//localStorage.getItem(difficulty + '_last_completed_level');
			this.setLocalParam({ last_completed_level: levelsWins + 1, level: this.currentLevel + 1 }, this.targetSaveKey, this.keyPrefix)

			// модалка "выиграна обычная игра"
			this.gameModalTitle('win_label');
			this.gameModalBodyClean(); // чистим модалку от кнопок
			$('#gameModal_Body').append(
				'<p>' + lang.get('gameover_score') + ': ' + this.gameStats + ' ' + lang.get('points') + '</p>'+
				'<p>' + lang.get('gameover_total_score') + ': ' + totalScore + '</p>'
			);
			this.gameModalButton('new_game', 'win_new_game', 'restart btn-primary blue_color', '#')
			this.gameModal.show();
		}

		const easyCnt = this.getLocalParam('last_completed_level', 'easy', this.userHash),
			  mediumCnt = this.getLocalParam('last_completed_level', 'medium', this.userHash),
			  hardCnt = this.getLocalParam('last_completed_level', 'hard', this.userHash),
			  expertCnt = this.getLocalParam('last_completed_level', 'expert', this.userHash),
			  guruCnt = this.getLocalParam('last_completed_level', 'guru', this.userHash);

		const levelsCompleted = easyCnt + mediumCnt + hardCnt + expertCnt + guruCnt;

		console.log('Total wins counter: ', levelsCompleted);
		this.yaGoal('win_'+levelsCompleted);
	}
	else if (value === 'lose') {
		console.log('LOSE!');

		// Начисление очков при поражении - не начисляем
		/*
		if (parseInt(this.gameStats) > 0) {
			totalScore += 0;
		} else {
			totalScore += parseInt(this.gameStats); //console.log('totalScore: ', totalScore)
		}
		this.saveLocal('totalScore', totalScore, this.userHash);
		*/
		this.status = this.END;

		this.gameModalTitle('lose_label');
		this.gameModalBodyClean(); // чистим модалку от кнопок
		$('#gameModal_Body').append(
			'<p>' + lang.get('lose_description') + '</p>'+
			'<p>' + lang.get('gameover_score')+ ': ' + this.gameStats + ' ' + lang.get('points') + '<br>' +
			lang.get('gameover_total_score') + ': ' + totalScore + ' ' + lang.get('points') + '</p>'
		);
		//this.gameModalButton('lose-game-continue', 'continue_with_reward', 'lose-game-continue btn-primary blue_color', '#');
		this.gameModalAdsButton();
		this.gameModalButton('reload', 'restart', 'btn-secondary', '#');

		/*
		$gameOverDiv.append([
			$('<div id="lose-game-continue" class="lose-game-continue"><button class="continue-with-reward rounded-2" id="continue-with-reward"><i class="gift-hint"></i>' + lang.get('continue_with_reward') + '</button></div>'),
			$('<p><a id="reload" class="restart rounded-2 start_new_game">' + lang.get('restart') + '</a></p>')
		])
		*/

		if (!this.allowShowReward()) {
			this.renderContinueRewardTimer()
		}

		$gameOverContainer.show();
		_this.gameModal.show()
		this.yaGoal('lose');
	}

	// this.saveCurrentGame()
	this.saveProfile();

	$('#reload').click(function () {
		console.log('RELOAD!')
		_this.yaGoal('restart')

		location.reload()
	});

	$('#continue-with-reward').click(() => {
		_this.showReward(function () {
			console.log('Reward success !!!');

			_this.status = _this.RUNNING
			_this.maxMistakes++
			_this.autosave()
			_this.saveProfile()

			$('.mistakes').text(_this.mistakes + '/' + _this.maxMistakes);
			//$gameOverContainer.hide();
			_this.gameModal.hide();
		})
	});

	$('#new_game').click(function () {
		_this.yaGoal('new_game')

		setTimeout(function () {
			location.reload();
		}, 500)
	});
	
};

/* Контент в модальных окнах */
Sudoku.prototype.gameModalBodyClean = function () {
	$('#gameModal_Body').html('');
}

Sudoku.prototype.gameModalTitle = function (label) {
	$('#gameModal_Title').html('<p class="modal-title fs-4 fw-medium mx-auto">' + lang.get(label) + '</p>');
}

Sudoku.prototype.gameModalButton = function (id, label, style, link) {
	$('#gameModal_Body').append(
		'<a class="btn btn-lg ' + style + '" id="' + id + '" href="'+ link +'" role="button">' +lang.get(label)+ '</a>'
	);
}

Sudoku.prototype.gameModalAdsButton = function () {
	$('#gameModal_Body').append(
		'<div id="lose-game-continue" className="lose-game-continue">' +
			'<button className="continue-with-reward" id="continue-with-reward" class="btn btn-lg btn-success col-12">' +
				'<i className="gift-hint"></i>' + lang.get('continue_with_reward') +
			'</button>' +
		'</div>'
	);
}


Sudoku.prototype.pause = function(t) {
	if(this.status === this.RUNNING) {
		this.status = this.PAUSE;
		console.log('[Pause] start');
		/*
		this.gameModalBodyClean();
		this.gameModalTitle('pause_label');
		this.gameModalButton('continue', 'continue', 'btn-primary blue_color', '#');
		this.gameModalButton('reload', 'restart', 'btn-secondary', '#');
		this.gameModal.show();
		*/
	}
	else{
		this.status = this.RUNNING;
		console.log('[Pause] stop');
	}

	console.log('[Pause] this.status: ' + t.status);

};

Sudoku.prototype.continue = function (t) {
	console.log('continue!');
	//$('.gameover_container').hide();
	t.gameModal.hide();
	ym(91807948, 'reachGoal', 'continue');
	t.status = t.RUNNING;
	console.log('[Continue] this.status: ' + t.status);
}

Sudoku.prototype.restart = function (t) {
	ym(91807948, 'reachGoal', 'continue_restart');
	console.log('restart!');
	t.autosave(true);
	console.log('[Restart] this.status: ' + t.status);
	/*
	setTimeout(function(){
		location.reload();
	}, 2000);
	*/
	location.reload();
}

Sudoku.prototype.startNewGame = function (t) {
	this.yaGoal('start_new_game')

	t.autosave('start_new_game');
	t.saveProfile();

	/*setTimeout(function(){
		location.reload();
	}, 2000);*/

	location.reload();
}

Sudoku.prototype.checkGameSettings = function(){

	console.log('%c CHECK GAME SETTINGS ', 'color:red;');

	$(".form-check-input").each(function () {

		let paramValue = Sudoku.prototype.getLocalParam(this.id,'settings', userHash);

		if(paramValue){
			this.setAttribute("checked", "");
			//console.log('%c'+this.id+': ', 'color:green;', paramValue);
		}
		else {
			this.removeAttribute("checked");
			//console.log('%c'+this.id+': ', 'color:red;', paramValue);
		}
	});
}

Sudoku.prototype.checkButtonsState = function() {

	if(this.getLocalParam('hide_buttons','settings', userHash)) {
		for (i = 1; i < 10; i++) {
			let digitsCounter = this.currentBoard.reduce((acc, n) => n === i ? acc + 1 : acc, 0);
			//console.log('[CHECK BUTTONS STATE ' + i + ']: ' + digitsCounter);
			// если их 9, то отключаем кнопку с цифрой
			if (digitsCounter == 9) {
				$('#digit_' + i).addClass('disabled');
			}
		}
	}
}

/**
Run a new sudoku game
*/
Sudoku.prototype.run = function(){
	const t = this;

	if(this.keyPrefix === 'daily') {
		console.log('IT"S DAILY!')
	}

	this.status = this.RUNNING;
	this.drawBoard();
	// проверяем настройки игры
	this.checkGameSettings();
	// this.saveProfile()
	this.checkButtonsState();

	if (this.keyPrefix === 'daily') {
		if (dayState === 'win') {
			this.status = this.PAUSE;
			console.log('DAILY LEVEL IS WIN - SHOW MODAL');

			// Модалка на старте уже пройденного дня
			this.gameModalBodyClean();
			this.gameModalTitle('daily_is_win');
			this.gameModalButton('new_game', 'to_daily_page', 'restart btn-primary blue_color', backUrl)
			this.gameModalButton('reload', 'restart', 'btn-secondary', '#');
			this.gameModal.show();
		}
		else {
			console.log('DAILY LEVEL IS NOT WIN');
			$.post('/api/daily/save/', {key: this.targetSaveKey, state: 'run'});
		}
	}
	else {
		dayState = 'none';
	}

	if (this.currentBoard != this.board && dayState !== 'win' ) {
		this.status = this.PAUSE;

		// Модалка на старте уровня
		this.gameModalBodyClean();
		this.gameModalTitle('continue_label');
		this.gameModalButton('continue', 'continue', 'btn-primary blue_color', '#');
		this.gameModalButton('reload', 'restart', 'btn-secondary', '#');

		// this.showModal({})

		if(this.keyPrefix !== 'daily') {
			$('#gameModal_Body').append('<hr/>');
			this.gameModalButton('new_game', 'new_game', 'btn-light', '#');
		}
		this.gameModal.show();
	}

	$(document).on('click', '#pause', function () {
		t.pause(t);
	});

	$(document).on('click', '#continue', function() {
		t.continue(t);
	});

	$(document).on('click', '#continue-from-pause', function() {
		t.continue(t);
	});

	$(document).on('click', '#reload', function() {
		if(dayState === 'win') {
			$.post('/api/daily/save/', {key: t.targetSaveKey, state: 'run'});
		}
		t.restart(t);
	});

	$(document).on('click', '#reload_modal', function () {
		t.restart(t);
	});

	$(document).on('click', '#reload-from-pause', function () {
		t.restart(t);
	});

	$(document).on('click', '#new_game', function () {
		t.startNewGame(t);
	});

	console.timeEnd("loading time");

	//click on board cell
	$('#'+ this.idBoardEl +' .sudoku_board .cell').on('click', function(e){
		t.cellSelect(this);
	});

	// click on console num - ввод данных из console
	$('#' + this.idConsoleEl).on('click', '.board_console_container .num', function (e) {
		var value = $.isNumeric($(this).text()) ? parseInt($(this).text()) : 0,
			clickMarkNotes = $(this).hasClass('note'),
			clickRemove = $(this).hasClass('remove'),
			numSelected = $(this).hasClass('selected'), // пометка для выбранных чисел
			clickHint = $(this).hasClass('hint');

		if (clickRemove) {
			t.removeNote(0).addValue(0).showConsole();
			console.log('clickRemove');
		}

		if (clickHint) {
			//t.removeNote(value);
			t.showHint();
			console.log('clickHint');
		}

		if (clickMarkNotes) {
			// если кликнули по заметкам
			console.log('clickMarkNotes' + t.markNotes);
			t.markNotes = !t.markNotes; // активируем или деактивируем режим заметок

			if (t.markNotes) { 								// при активации добавляем подсветку Notes
				$(this).addClass('selected');
				//t.showConsole()				
			} else { 										// при деактивации убираем подсветку Notes
				$(this).removeClass('selected');
				//t.showConsole();
			}
		}

		else {
			if (t.markNotes) {
				if (!numSelected) {
					if (!value) {
						//t.removeNote(0);//.hideConsole();
					} else {
						t.addValue(0).addNote(value); //.hideConsole();
						t.showConsole();
					}
				} else {
					t.removeNote(value);//.hideConsole();
					t.showConsole();
				}
			} else {
				if (value) {
					// Вставка значения, проверка на запрет ввода
					if(t.getLocalParam('hide_buttons','settings', userHash))
					{
						if ($('#digit_'+value).hasClass('disabled')){
							console.log('[ADD VALUE DISABLED]');
						}
						else {
							t.removeNote(0).addValue(value);
						}
					}
					else
					{
						t.removeNote(0).addValue(value);
					}
				}
			}
		}
	});
    

	$(document).on('keyup', function(event){

		if(event.key >= 1 && event.key <= 9) {
			console.log('Key: ', event.key);
			console.log('keyCode: ', event.keyCode);

			var value = parseInt(event.key);

			if (t.markNotes) {
				if ( $('.cell.current').find('.note:contains('+value+')').length > 0 ) {
					console.log('FOUND NOTE: ' + value);
					t.removeNote(value);
					t.showConsole();
				}
				else{
					t.addValue(0).addNote(value);
					t.showConsole();
				}
			}
			else {
				if(value) {
					// Вставка значения, проверка на запрет ввода
					if(t.getLocalParam('hide_buttons','settings', userHash))
					{
						if ($('#digit_'+value).hasClass('disabled')){
							console.log('[ADD VALUE DISABLED]');
						}
						else {
							t.removeNote(0).addValue(value);
						}
					}
					else
					{
						t.removeNote(0).addValue(value);
					}
				}
			}
		}

		if(event.key == 0 || event.keyCode == 46 || event.keyCode == 8){ // if 0, Del, Backspace
			console.log('Key: ', event.key);
			console.log('keyCode: ', event.keyCode);

			t.removeNote(0).addValue(0);
			t.showConsole();

			console.log('clickRemove');
		}

		if(event.keyCode == 37 || event.keyCode == 65) { // стрелка влево
			var current_cell_id = $('.cell.current').attr('id');
			var next_cell_id = parseInt(current_cell_id) - 1;

			if(next_cell_id >= 1){
				$('#'+ next_cell_id+'.cell ').trigger('click');
			}
		}

		if(event.keyCode == 38 || event.keyCode == 87) { // стрелка вверх
			//event.preventDefault();
			var current_cell_id = $('.cell.current').attr('id');
			var next_cell_id = parseInt(current_cell_id) - 9;

			if(next_cell_id >= 1){
				$('#'+ next_cell_id+'.cell ').trigger('click');
			}
		}

		if(event.keyCode == 39 || event.keyCode == 68) { // стрелка вправо
			var current_cell_id = $('.cell.current').attr('id');
			var next_cell_id = parseInt(current_cell_id) + 1;

			if(next_cell_id <= 81){
				$('#'+ next_cell_id+'.cell ').trigger('click');
			}
		}

		if(event.keyCode == 40 || event.keyCode == 83) { // стрелка вниз
			var current_cell_id = $('.cell.current').attr('id');
			var next_cell_id = parseInt(current_cell_id) + 9;

			if(next_cell_id <= 81){
				$('#'+ next_cell_id+'.cell ').trigger('click');
			}
		}

		if(event.keyCode == 78) {  // если кликнули по заметкам
			console.log('clickMarkNotes' + t.markNotes);
			t.markNotes = !t.markNotes;						// активируем или деактивируем режим заметок

			if(t.markNotes) { 								// при активации добавляем подсветку Notes
				$('.num.note').addClass('selected');
			} else { 										// при деактивации убираем подсветку Notes
				$('.num.note').removeClass('selected');
			}
		}

		if(event.keyCode == 72) {
			t.showHint();
			console.log('clickHint');
		}

	});

	// управление настройками через селекты
	$(".form-check-input").on("click", function () {
		let settings_param = {};

		if (this.checked) {
			this.setAttribute("checked", "");
			settings_param[this.id] = true;
			Sudoku.prototype.setLocalParam(settings_param, 'settings', userHash)
		}
		else {
			this.removeAttribute("checked");
			settings_param[this.id] = false;
			Sudoku.prototype.setLocalParam(settings_param, 'settings', userHash)
		}
		//console.log(this.parentNode.innerHTML, '\n', this.id);
		console.log('[SETTING]: ' + this.id);
	});

	//click outer console
	$('#'+ this.idConsoleEl +' .board_console_container').on('click', function(e){
		if ( $(e.target).is('.board_console_container') ) {
					//$(this).hide();
			}
	});
    
	$( window ).resize(function() {
		t.resizeWindow();
	});
};

Sudoku.prototype.autosave = function (restart){
	consoleDebug.log('-= *AUTOSAVE* =-');
	const gameData = this.gameData();

	if (this.mistakes >= this.maxMistakes || this.cellsComplete === this.cellsNr || restart === true || restart === 'start_new_game') {
		console.log('-= *WIN / LOSE* =-');

		let newGameData = this.blankGameData();
		newGameData.level = gameData.level
		newGameData.last_completed_level = gameData.last_completed_level; //this.getLocalParam('last_completed_level', this.targetSaveKey, this.keyPrefix)

		if (restart === 'start_new_game') {
			newGameData.level++
		} else {

		}

		this.saveLocal(this.targetSaveKey, newGameData, this.keyPrefix)

		if (this.keyPrefix !== 'daily')
			this.saveRemote(this.targetSaveKey, newGameData)
	} else {
		// Сохранение текущей игры
		console.log('Autosave (gameData): ', gameData)
		console.log('targetSaveKey: ', this.targetSaveKey)

		// this.save(this.targetSaveKey, gameData)
		this.saveLocal(this.targetSaveKey, gameData, this.keyPrefix)

		if (this.keyPrefix !== 'daily')
			this.saveRemote(this.targetSaveKey, gameData)
	}

	this.saveLocal('currentHints', this.hintsCounter, this.userHash);
	consoleDebug.log('-= *AUTOSAVE END* =-');
};

Sudoku.prototype.blankGameData = function (full) {
	if (full === true || this.targetSaveKey !== 'daily') {
		return { board: [], notes: [], score: 0, errors: 0, time: 0, level: 0, last_completed_level: 0 };
	}

	return { board: [], notes: [], score: 0, errors: 0, time: 0 };
}

Sudoku.prototype.addCurrentHints = function () {
	this.hintsCounter++;
	this.saveLocal('currentHints', this.hintsCounter)
	this.saveRemote('currentHints', this.hintsCounter)

	$('#hint-btn span').text( lang.get('button_hints') + ' (' + this.hintsCounter + ')')
}

Sudoku.prototype.getNow = () => {
	return Math.floor(Date.now() / 1000);
}

Sudoku.prototype.allowShowReward = function ()
{
	const lastRewardAt = parseInt(this.getSetting('lastRewardAt')),
		now = this.getNow()

	// console.log('Now: ',  now )
	// console.log('lastRewardAt: ', lastRewardAt)
	// console.log('Now diff: ', now - lastRewardAt)

	return !lastRewardAt || now - lastRewardAt > 40;
}

Sudoku.prototype.renderRewardAction = function (timerElementId, stopCallback)
{
	if (this.allowShowReward()) {
		stopCallback.call()
	} else {
		const lastRewardAt = this.getSetting('lastRewardAt'),
			diff = this.getNow() - lastRewardAt;

		let secondsLeft = 40 - diff;

		$(timerElementId).text('00:'+ String(secondsLeft).padStart(2, '0'))

		let timer = setInterval(function () {
			secondsLeft--;
			$(timerElementId).text('00:'+ String(secondsLeft).padStart(2, '0'))

			if (secondsLeft <= 0) {
				console.log('Timer end')

				clearInterval(timer);
				$(timerElementId).remove(); // or hide
				stopCallback.call();
			}
		}, 1000);
	}
}

Sudoku.prototype.renderContinueRewardTimer = function ()
{
	console.log('Add reward timer (game over)')
	const $continueBlock = $('#lose-game-continue'),
		$continueBtn = $('#continue-with-reward');

	if ($continueBlock.length) {
		$continueBlock.append($('<div id="game-over-reward-timer" class="game-over-reward-timer"></div>'))
		$continueBtn.prop('disabled', true)

		this.renderRewardAction('#game-over-reward-timer', function () {
			$continueBtn.prop('disabled', false)
		});
	}
}

Sudoku.prototype.renderHintRewardTimer = function ()
{
	if (this.hintsCounter === 0) {
		$('#hint-btn').append($('<div id="hint-reward-timer-wrapper" class="hint-reward-timer"><span id="hint-reward-timer"></span></div>'));

		this.renderRewardAction('#hint-reward-timer', function () {
			$('#hint-reward-timer-wrapper').remove()
		});
	}
}

Sudoku.prototype.startRewardTimer = function (lastRewardAt)
{
	if (!lastRewardAt)
		lastRewardAt = this.getSetting('lastRewardAt');

	const diff = this.getNow() - lastRewardAt,
		timeLeft = 40 - diff;

	console.log('Start timer: ', timeLeft)

	setTimeout(function () {
		$('#hint-btn').addClass('show-reward');
	}, timeLeft * 1000);

	this.renderContinueRewardTimer();
	this.renderHintRewardTimer()

	return timeLeft
}

Sudoku.prototype.showReward = function (successAction)
{
	console.log('Reward...');

	const _this = this,
		now = this.getNow();

	if (this.allowShowReward()) {
		this.setSetting('lastRewardAt', now);

		$('#hint-btn').removeClass('show-reward');

		yaReward(function (isRewarded) {
			console.log('isRewarded: ', isRewarded);

			if (isRewarded) {
				if (typeof successAction == 'undefined') {
					_this.addCurrentHints()
				} else {
					successAction.call()
				}
			}

			_this.startRewardTimer()
		})
	}
}

Sudoku.prototype.isInit = function ()
{
	// TODO
}

async function load(){
	if (typeof level === 'undefined')
		level = 40;

	const _this = this;

	let cellsComplete = 0,
		loadboard = [],
		boardSolution = [],
		board_init = [],
		currentBoard = [];

	if (typeof customLevelStart !== 'undefined') {
		currentLevel = parseInt(customLevelStart)
		console.log('[LOAD - DIFFICULTY]: ' + difficulty);

		if(Sudoku.prototype.getLocalParam('hard_mode', 'settings', userHash))
		{
			const difficultyMap = ['easy', 'medium', 'hard', 'expert', 'guru'];
			let diffID = difficultyMap.indexOf(difficulty);

			difficulty = difficultyMap[diffID + 2]; // hard, expert, guru
			console.log('[LOAD - NEW DIFFICULTY]: ' + difficulty);
		}

	} else {

		console.log('[LOAD - DIFFICULTY 2 ]: ' + difficulty);
		currentLevel = Sudoku.prototype.getLocalParam('level', difficulty, keyPrefix);

		// if (currentLevel === null) {
			// last_completed_level + 1
		// }
	}

	// NULL-DATA BUG
	// {"board":null,"notes":null,"score":null,"errors":null,"time":null,"level":null,"last_completed_level":null}

	if(currentLevel === null){
		//console.log('%c[currentLevel on Load]: '+currentLevel, 'color:red' );
		currentLevel = 0;
		Sudoku.prototype.saveLocal('lastSync', null, userHash); // force update user profile
		//console.log('%c[lastSync on Load]: ' + Sudoku.prototype.getLocal('lastSync'), 'color:red' );
	}

	console.log('currentLevel: ' + difficulty + '_' + currentLevel);

	if (currentLevel > 1099) {
		console.log('[Replace] currentLevel: ' + difficulty + '_' + currentLevel);
		currentLevel = 0;
		// localStorage.setItem(difficulty + '_current_level', currentLevel);
		Sudoku.prototype.setLocalParam({level: currentLevel}, difficulty, keyPrefix)
	}

	await $.getJSON("/levels/" + difficulty + "/Level_" + currentLevel + ".txt", function (data) {

		$.each(data.blocks, function (key, val) {
			boardSolution.push(val.andNum);
			board_init.push(val.num);
			if (parseInt(val.num) !== 0) cellsComplete++;
		});

	});

	// this.board = (this.displaySolutionOnly) ? this.boardSolution : test_board;

	/* ЗАГРУЖАЕМ СЭЙВЫ - зачем сейчас ?*/
	//currentBoard = JSON.parse(localStorage.getItem(difficulty +'_current_board'));

	const gameParams = {
		idBoardEl: 'sudoku_container',
		idConsoleEl: 'sudoku_console',
		idStatEl: 'sudoku_stats',
		id4: 'game_container',
		highlight: 1,
		fixCellsNr: level, // 40 (41) - easy, 30 (51) - medium, 25 (56) - hard, 22 (59) - expert
		displayTitle: 1,
		displaySolution: 0,
		//displaySolutionOnly: 1,
		board: board_init,
		solution: boardSolution,
		freecells: cellsComplete,
		savedboard: currentBoard,
		currentLevel: currentLevel
	};

	if (typeof targetSaveKey !== 'undefined') {
		gameParams.targetSaveKey = targetSaveKey;
	} else if (typeof difficulty !== 'undefined') {
		gameParams.targetSaveKey = difficulty;
	} else {
		throw new Error('Bad params');
	}

	if (typeof keyPrefix !== 'undefined') {
		gameParams.keyPrefix = keyPrefix;
	} else {
	}

	if (typeof userHash !== 'undefined') {
		gameParams.userHash = userHash;
	}

	const game = new Sudoku(gameParams);
	game.run();
}

/* INIT NEW PLAYER */
function playerInit() {
	localStorage.setItem('easy_last_completed_level', 1);
	localStorage.setItem('easy_current_level', 2);
	localStorage.setItem('easy_current_board', 0);
	localStorage.setItem('easy_current_notes', 0);
	localStorage.setItem('easy_current_score', 0);
	localStorage.setItem('easy_current_errors', 0);
	localStorage.setItem('easy_current_time', 0);

	localStorage.setItem('medium_last_completed_level', 9);
	localStorage.setItem('medium_current_level', 10);
	localStorage.setItem('medium_current_board', 0);
	localStorage.setItem('medium_current_notes', 0);
	localStorage.setItem('medium_current_score', 0);
	localStorage.setItem('medium_current_errors', 0);
	localStorage.setItem('medium_current_time', 0);

	localStorage.setItem('hard_last_completed_level', 19);
	localStorage.setItem('hard_current_level', 20);
	localStorage.setItem('hard_current_board', 0);
	localStorage.setItem('hard_current_notes', 0);
	localStorage.setItem('hard_current_score', 0);
	localStorage.setItem('hard_current_errors', 0);
	localStorage.setItem('hard_current_time', 0);

	localStorage.setItem('expert_last_completed_level', 29);
	localStorage.setItem('expert_current_level', 30);
	localStorage.setItem('expert_current_board', 0);
	localStorage.setItem('expert_current_score', 0);
	localStorage.setItem('expert_current_notes', 0);
	localStorage.setItem('expert_current_errors', 0);
	localStorage.setItem('expert_current_time', 0);

	localStorage.setItem('guru_last_completed_level', 39);
	localStorage.setItem('guru_current_level', 40);
	localStorage.setItem('guru_current_board', 0);
	localStorage.setItem('guru_current_notes', 0);
	localStorage.setItem('guru_current_score', 0);
	localStorage.setItem('guru_current_errors', 0);
	localStorage.setItem('guru_current_time', 0);

	localStorage.setItem('user_rang', 'beginner');
	localStorage.setItem('total_score', 0);
	localStorage.setItem('currentHints', 3);

	localStorage.setItem('player_init', '1');
	console.log('Player initialization');
}

function getOldFormatData(name, migrate) {
	let data = Sudoku.prototype.blankGameData(true);

	if (migrate) {
		data.last_completed_level = parseInt(localStorage.getItem(name + '_last_completed_level'))
		data.level  = parseInt(localStorage.getItem(name + '_current_level'))
		data.board  = localStorage.getItem(name + '_current_board')
		data.notes  = localStorage.getItem(name + '_current_notes')
		data.score  = parseInt(localStorage.getItem(name + '_current_score'))
		data.errors = parseInt(localStorage.getItem(name + '_current_errors'))
		data.time   = parseInt(localStorage.getItem(name + '_current_time'))

		if (data.board === '0') {
			data.board = []
		} else {
			data.board = JSON.parse(data.board)
		}

		if (data.notes === '0') {
			data.notes = []
		} else {
			data.notes = JSON.parse(data.notes)
		}
	}

	return data;
}

function initPlayerV2(migrate) {
	if (migrate === undefined)
		migrate = false

	let easyData = getOldFormatData('easy', migrate); //Sudoku.prototype.blankGameData(true);
	let mediumData = getOldFormatData('medium', migrate); //Sudoku.prototype.blankGameData(true);
	let hardData = getOldFormatData('hard', migrate); //Sudoku.prototype.blankGameData(true);
	let expertData = getOldFormatData('expert', migrate); //Sudoku.prototype.blankGameData(true);
	let guruData = getOldFormatData('guru', migrate); //Sudoku.prototype.blankGameData(true);

	Sudoku.prototype.saveLocal('easy', easyData, keyPrefix)
	Sudoku.prototype.saveLocal('medium', mediumData, keyPrefix)
	Sudoku.prototype.saveLocal('hard', hardData, keyPrefix)
	Sudoku.prototype.saveLocal('expert', expertData, keyPrefix)
	Sudoku.prototype.saveLocal('guru', guruData, keyPrefix)

	Sudoku.prototype.saveLocal('totalScore', localStorage.getItem('total_score') || 0, keyPrefix)
	Sudoku.prototype.saveLocal('userRang', localStorage.getItem('user_rang') || 'beginner', keyPrefix)
	Sudoku.prototype.saveLocal('currentHints', localStorage.getItem('currentHints') || 3, keyPrefix)

	localStorage.setItem('player_init', '2');

	if (keyPrefix !== undefined) {
		Sudoku.prototype.saveLocal('playerInit', '2', keyPrefix)
	}
}

function createLocalData() {
	const fields = [
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

	const data = {};

	fields.forEach(function (param) {
		// console.log('Param: ', param)
		data[param] = localStorage.getItem(param)
	})

	return JSON.stringify(data);
	// return data;
}

// function moveData() {
// 	const migrateUrl = '';
//
// 	$.post('/move/api.php?action=save', {data: createLocalData()}, function (result) {
// 		console.log('Save: ', result);
//        ym(91807948,'reachGoal','datasync');
//
// 		if (result.success || result.error == 'EXISTS') {
// 			// redirect to migrateUrl...
//
//
// 			// $.get('http://sudoku-app.local/import/set-user/?id='+result.user_id, function (result) { console.log(result) ;});
// 			// $('body').append('<img src="https://sudoku-guru.ru/import/set-user/?id='+result.user_id+'" />')
// 			// $('body').append('<img src="https://sudoku-guru.ru/test_img/img.php" />')
// 		} else {
// 			console.log('Fail save...')
// 		}
// 	});
// }

//main
$(function() {
    
	console.time("loading time");

	$('#open-new-game').removeClass('d-none')

	/*if (!localStorage.getItem('player_init')) {
		//localStorage.setItem('player_moved', 'true');
		console.log('Init: first data')
		playerInit();
		// initPlayerV2();
	} else { //if(localStorage.getItem('player_moved') != 'true')
		// moveData();

		let initV = localStorage.getItem('player_init');

		if (initV === '1') {
			console.log('Migrate config...')
			initPlayerV2(true);
		}
	}*/

	let legacyInitV = localStorage.getItem('player_init');

	if (legacyInitV === '1') {
		initPlayerV2(true);
	} else if (typeof keyPrefix !== 'undefined') {
		let initV = Sudoku.prototype.getLocal('playerInit', keyPrefix);

		if (!initV) {
			initPlayerV2();
		} else if (parseInt(initV) === 2 && Sudoku.prototype.getLocal('easy', keyPrefix) === 'undefined') {
			initPlayerV2(true);
		}
	}

	/* ADD GAME SETTINGS */
	if(typeof userHash !== 'undefined') {
		let outputColor = "color:red;"
		if(!Sudoku.prototype.getLocal('settings', userHash))
		{
			console.log('%c NO SETTINGS', outputColor);
			Sudoku.prototype.saveLocal('settings', {"hide_buttons": true,"remove_notes": true, "highlight_same": true, "highlight_areas": true, "highlight_duplicates": true, "count_mistakes": true, "hard_mode": false}, userHash);
		}
		else{
			console.log('%c SETTINGS: ', outputColor, Sudoku.prototype.getLocal('settings', userHash));
		}
	}

	load();
	//console.timeEnd("loading time");
})

function yaReward(onRewardedCallback) {
	console.log('Reward...');

	if (window.yaContextCb === undefined) {
		console.log('Ya js not connected')

		if (confirm('Open reward')) {
			onRewardedCallback(true);
		} else {
			onRewardedCallback(false);
		}
	} else {
		window.yaContextCb.push(()=>{
			if (Ya.Context.AdvManager.getPlatform() === 'desktop') {
				Ya.Context.AdvManager.render({
					blockId: 'R-A-4767300-3',
					type: "rewarded",
					platform: "desktop",
					onRewarded: onRewardedCallback
				})
			} else {
				Ya.Context.AdvManager.render({
					blockId: 'R-A-4767300-4',
					type: "rewarded",
					platform: "touch",
					onRewarded: onRewardedCallback
				})
			}
		})
	}
}