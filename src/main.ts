//L16 Dialog - add button (setup)

const APP_NAME = "Geocacher";
const app = document.querySelector<HTMLDivElement>("#app")!;
const test_button = document.createElement("button");
test_button.innerHTML = "Click Here!";

app.append(test_button);

test_button.addEventListener("click", () => {
  alert("Welcome to " + APP_NAME + "!");
});
