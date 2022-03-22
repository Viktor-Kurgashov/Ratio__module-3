// всё что связано с перемещением не изменилось, кроме preventDefault на стрелках, все объяснения оставил во втором модуле, раскидал всё по объектам

class Game {
  constructor (field, restartBtn, scoreElem, recordForm, recordsTable, max = 2048) {
    this.active = true;
    this.field = field;
    this.max = max;
    this.items = [];

    for (let i = 0; i < 25; i++) {
      this.items.push({
        id: false,
        value: false,
        index: i
      })
    };


    restartBtn.addEventListener('click', () => this.restart());

    recordForm.addEventListener('submit', async (event) => {  // после победы отправка формы с username
      event.preventDefault();
      this.form.lock();  // блочится до ответа с сервера

      await this.records.send(
        event.currentTarget.children[0].value,
        this.timer.result
      );
      this.restart();
    });



    this.touchStartX = undefined;
    this.touchStartY = undefined;

    this.limit = Math.round(this.field.offsetWidth / 8);
    window.addEventListener('resize', () => this.limit = Math.round(this.field.offsetWidth / 8));



    this.field.addEventListener('touchstart', event => {
      this.touchStartX = event.changedTouches[0].clientX;
      this.touchStartY = event.changedTouches[0].clientY;
    });

    this.field.addEventListener('touchend', () => this.touchStartX = this.touchStartY = undefined);

    this.field.addEventListener('touchmove', event => {
      event.preventDefault();
      if (this.active) {
        if (event.changedTouches[0].clientX - this.touchStartX < -50) this.move('left');
        else if (event.changedTouches[0].clientX - this.touchStartX > 50) this.move('right');
        else if (event.changedTouches[0].clientY - this.touchStartY < -50) this.move('top');
        else if (event.changedTouches[0].clientY - this.touchStartY > 50) this.move('down');
      }
    });



    document.body.addEventListener('keydown', event => {
      if (this.active) {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          this.move('top');
        }
        else if (event.key === 'ArrowDown') {
          event.preventDefault();
          this.move('down');
        }
        else if (event.key === 'ArrowRight') this.move('right');        
        else if (event.key === 'ArrowLeft') this.move('left');
      }
    });



    this.score = {
      clear() { this.elem.textContent = '0' },

      add(value) { this.elem.textContent = +this.elem.textContent + value; },

      elem: scoreElem
    },



    this.timer = {
      clear() {
        fetch('/api/v1/timer', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: 'clear'
        })
          .then(() => {
            console.log('--Timer cleared');
            this.running = false;
          })
      },

      start() {
        fetch('/api/v1/timer', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: 'start'
        })
          .then(() => {
            console.log('--Timer started');
            this.running = true;
          })
      },

      finish() {
        fetch('/api/v1/timer', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: 'finish'
        })
          .then(res => res.text())
          .then(text => {
            console.log(`--Timer finised: ${text}s`);
            this.running = false;
            this.result = text;
          })
      },

      running: false,
      result: undefined
    };



    this.form = {
      show() { this.elem.style.display = ''; },

      hide() { this.elem.style.display = 'none'; },

      lock() { this.elem.children[0].disabled = this.elem.children[1].disabled = true; },

      unlock() { this.elem.children[0].disabled = this.elem.children[1].disabled = false },

      elem: recordForm
    };



    this.records = {
      async send(name, time) {
        await fetch('/api/v1/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, time })
        })
          .then(res => res.text())
          .then(text => console.log(`--Inserted record id: ${text}`));
      },

      get() {
        fetch('/api/v1/record')
          .then(res => res.json())
          .then(data => {
            this.clear();
            this.render(data);
          });
      },

      clear() {
        let rows = this.table.getElementsByTagName('tr');

        while (rows[0]) { rows[0].remove(); }
      },

      render(data) {
        data.sort((a, b) => a.time - b.time);

        data.forEach(item => {
          item.time = Math.floor(item.time / 60).toString().padStart(2, 0) +
            ':' + Math.floor(item.time % 60).toString().padStart(2, 0);

          this.table.insertAdjacentHTML(
            'beforeend',
            '<tr>' +
              `<td>${item.name}</td>` +
              `<td>${item.time}</td>` +
            '</tr>'
          );
        })
      },

      table: recordsTable.lastElementChild // каждая tr оборачивалась в tbody, пришлось вставить tbody сразу
    };



    this.records.get();
    this.fill();  // создаёт джва элемента на поле
  };  // конец конструктора
  // game over всё так же нет




  move(dir) {
    this.active = false;

    if (!this.timer.running) this.timer.start();

    for (let line = 0; line < 5; line++) {
      const current =
        (dir === 'top') ? this.items.filter((i, index) => index % 5 === line) :
          (dir === 'down') ? this.items.filter((i, index) => index % 5 === line).reverse() :
            (dir === 'left') ? this.items.filter((i, index) => Math.floor(index / 5) === line) :
              (dir === 'right') ? this.items.filter((i, index) => Math.floor(index / 5) === line).reverse() : [];

      const result = current.filter(item => item.id !== false);

      for (let i = result.length - 1; i > 0; i--) {
        let last = result[i];
        let prev = result[i - 1];

        if (last.value === prev.value) {
          this.increase(this.items[prev.index]);
          this.removeItem(this.items[last.index]);
          result.splice(i, 1);
          i -= 1;
        }
      }

      current.forEach((i, n) => {
        this.items[current[n].index].id = (result[n]) ? result[n].id : false;
        this.items[current[n].index].value = (result[n]) ? result[n].value : false;
      });

      current.filter(item => item.id !== false).forEach(item => this.setPosition(item));
    }

    setTimeout(() => {
      this.createItem();
      this.active = true;
    }, 250);
  }



  increase(item) {
    let elem = document.getElementById(item.id);
    elem.textContent = item.value *= 2;

    elem.classList.add('n' + item.value);
    elem.classList.remove('n' + item.value / 2);
 
    this.score.add(item.value);
    if (+item.value >= this.max) this.win();
  }



  createItem() {
    const emptyCells = this.items.filter(item => !item.id);

    if (emptyCells.length) {
      const index = Math.floor(Math.random() * emptyCells.length);
      let item = this.items[emptyCells[index].index];

      item.value = (Math.floor(Math.random() * 10) === 9) ? 4 : 2;
      item.id = 'i' + Date.now();

      this.field.insertAdjacentHTML('beforeend', `<li class="item n${item.value}" id="${item.id}">${item.value}</li>`);
      this.setPosition(item);
    }
  }



  removeItem(item) {
    document.getElementById(item.id).remove();
    item.id = item.value = false;
  }



  setPosition(item) {
    let elem = document.getElementById(item.id);
    elem.style.left = Math.round(item.index % 5 * 192) / 10 + 4 + '%';
    elem.style.top = Math.round(Math.floor(item.index / 5) * 192) / 10 + 4 + '%';
  }



  win() {
    setTimeout(() => this.active = false, 300);
    this.timer.finish();
    this.form.show();
  }



  restart() {
    this.items
      .filter(item => item.id)
      .forEach(item => {
        this.removeItem(this.items[item.index])
      });  // очищает поле

    this.timer.clear();
    this.score.clear();

    this.form.hide();
    this.form.unlock();

    this.fill();
    this.records.get();
    this.active = true;
  }



  fill() {  //
    setTimeout(() => this.createItem());
    this.createItem();
  }
}



let game = new Game(
  document.getElementById('field'),
  document.getElementById('restart'),
  document.getElementById('score'),
  document.getElementById('form'),
  document.getElementById('records')
);