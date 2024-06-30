function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

class PasswordPopup {
  constructor(options) {
    this.options = Object.assign(
      {
        wrapperId: "pwWrap",
        inputId: "account_pw",
        openButtonId: "openPwPopup",
        closeButtonClass: "close-button",
      },
      options
    );

    this.init();
  }

  init() {
    this.wrapper = document.querySelector(`#${this.options.wrapperId}`);
    this.input = document.querySelector(`#${this.options.inputId}`);
    this.openButton = document.querySelector(`#${this.options.openButtonId}`);

    if (!this.wrapper || !this.input || !this.openButton) {
      console.error("필요한 HTML 요소를 찾을 수 없습니다.");
      return;
    }

    this.closeButton = this.wrapper.querySelector(
      `.${this.options.closeButtonClass}`
    );

    if (!this.closeButton) {
      console.error("닫기 버튼을 찾을 수 없습니다.");
      return;
    }

    this.openButton.addEventListener("click", () => this.open());
    this.closeButton.addEventListener("click", () => this.close());
  }

  open() {
    this.wrapper.style.display = "block";
    this.generateKeypad();
    this.pwCheck = new PwCheck((password) => {
      this.input.value = password;
      this.close();
    });
  }

  close() {
    this.wrapper.style.display = "none";
  }

  generateKeypad() {
    const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    shuffle(numbers);
    numbers.push("0");
    const numberSection = document.querySelector("#numberSection");
    numberSection.innerHTML = "";

    numbers.forEach((number) => {
      const button = document.createElement("button");
      button.classList.add("number", "number-white");
      button.textContent = number;
      numberSection.appendChild(button);
    });

    const clearButton = document.createElement("button");
    clearButton.classList.add("number", "number-yellow");
    clearButton.textContent = "하나 지움";
    clearButton.style.gridColumn = "1 / 2";
    clearButton.style.gridRow = "4 / 5";
    numberSection.appendChild(clearButton);

    const allClearButton = document.createElement("button");
    allClearButton.classList.add("number", "number-yellow");
    allClearButton.textContent = "전체 지움";
    allClearButton.style.gridColumn = "3 / 4";
    allClearButton.style.gridRow = "4 / 5";
    numberSection.appendChild(allClearButton);
  }
}

class PwCheck {
  constructor(callback) {
    this.callback = callback;
    this.password = [];
    this.passwordNumber = [];
    this.cnt = 0;
    this.compChk = false;
    this.msg = ["Wrong Password! Try Again! 👿", "Success! 😍"];

    this.parent = document.querySelector(".pwWrap");
    this.dots = this.parent.querySelectorAll(".dot");
    this.message = this.parent.querySelector(".message");

    this.setupListeners();
  }

  setupListeners() {
    if (!this.compChk) {
      this.parent.querySelectorAll(".number").forEach((number) => {
        number.addEventListener("click", () => this.handleNumber(number));
      });
    }
  }

  handleNumber(number) {
    if (!this.compChk) {
      const textContent = number.textContent;
      if (textContent === "하나 지움") {
        if (this.cnt > 0) {
          this.passwordNumber.pop();
          this.cnt--;
          this.handleDotActive(false);
        }
      } else if (textContent === "전체 지움") {
        this.passwordNumber = [];
        this.cnt = 0;
        this.handleDotActive(false);
      } else {
        if (this.cnt < 6) {
          this.passwordNumber[this.cnt] = textContent;
          this.cnt++; // this.cnt 증가 시점을 여기로 이동
          this.handleDotActive(true);
          if (this.cnt === 6) {
            this.handleResult();
          }
        }
      }
    }
  }

  handleDotActive(type) {
    if (type) {
      if (this.cnt > 0 && this.cnt <= this.dots.length) {
        this.dots[this.cnt - 1].classList.add("active");
      }
    } else {
      this.dots.forEach((dot, i) => {
        if (i >= this.cnt) dot.classList.remove("active");
      });
    }
  }

  handleResult() {
    this.parent.classList.add("confirm");
    this.message.textContent = this.msg[1];
    this.compChk = true;
    this.callback(this.passwordNumber.join(""));
    setTimeout(() => {
      this.message.textContent = "";
      this.compChk = false;
      this.passwordNumber = [];
      this.cnt = 0;
      this.handleDotActive(false);
      this.parent.classList.remove("confirm");
    }, 1000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PasswordPopup();
});
