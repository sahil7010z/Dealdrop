/* ---------------------------------------------------------
   DealDrop Global Auth File
   Handles: Login + Signup + OAuth + DB Insert
---------------------------------------------------------- */
console.log("DealDrop JS loaded successfully!");

// ---- INIT SUPABASE ----
const SUPABASE_URL = "https://tguymmxsvpvicxhutlqc.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRndXltbXhzdnB2aWN4aHV0bHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4OTk4NTMsImV4cCI6MjA3OTQ3NTg1M30.6QHvp9JPwVJ5lWEkMSmqZJWQm9z45kkxQvv-RPLlnzo";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------------------------------------------------
   PASSWORD VALIDATION
---------------------------------------------------------- */
function validatePassword(password, confirmPassword) {
  if (password !== confirmPassword) return "Passwords do not match.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain 1 uppercase.";
  if (!/[0-9]/.test(password)) return "Password must contain 1 number.";
  if (!/[@$!%*?&]/.test(password)) return "Password must contain 1 special char.";
  return null;
}

/* ---------------------------------------------------------
   SIGNUP LOGIC
---------------------------------------------------------- */
async function initSignup() {
  const form = document.getElementById("signup-form");
  if (!form) return;

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "block";
    el.innerText = msg;
  }

  function clearErrors() {
    document.querySelectorAll(".error").forEach((e) => (e.style.display = "none"));
    document.querySelectorAll("input").forEach((i) => i.classList.remove("input-error"));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const fullName = fullname.value.trim();
const usernameRaw = username.value.trim();
const password = document.getElementById("password").value;
const confirmPassword = document.getElementById("confirmPassword").value; // ✅ FIXED
const email = document.getElementById("email").value.trim();

const cleanUsername = usernameRaw.toLowerCase();

let hasError = false;

if (fullName.length < 2) {
  showError("err-fullname", "Full name too short.");
  hasError = true;
}

if (cleanUsername.length < 3) {
  showError("err-username", "Username must be 3+ characters.");
  hasError = true;
}

const passErr = validatePassword(password, confirmPassword);
if (passErr) {
  showError("err-password", passErr);
  hasError = true;
}

if (!email.includes("@")) {
  showError("err-email", "Invalid email.");
  hasError = true;
}

if (hasError) return;

// ---- Check duplicate email ----
const { data: emailExists } = await supabaseClient
  .from("users")
  .select("id")
  .eq("email", email)
  .maybeSingle();

if (emailExists) {
  showError("err-email", "Email already registered.");
  return;
}


    // ---- Check duplicate username ----
    const { data: usernameExists } = await supabaseClient
      .from("users")
      .select("id")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (usernameExists) {
      showError("err-username", "Username already taken.");
      return;
    }

    // ---- Auth signup ----
    const { data: authUser, error: authErr } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, username: cleanUsername } },
    });

    if (authErr) {
      showError("err-email", authErr.message);
      return;
    }

    // ---- Insert into users table ----
    await supabaseClient.from("users").insert({
      id: authUser.user.id,
      full_name: fullName,
      username: cleanUsername,
      email: email,
      provider: "email",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    alert("Account created! Check your email.");
    window.location.href = "login.html";
  });
}

/* ---------------------------------------------------------
   LOGIN (Email or Username)
---------------------------------------------------------- */
async function initLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;

  function showErr(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "block";
    el.innerText = msg;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userInput = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!userInput) return showErr("login-err-email", "Enter email or username.");
    if (!password) return showErr("login-err-password", "Password required.");

    let emailToUse = userInput;

    // Username → Email lookup
    if (!userInput.includes("@")) {
      const cleanUsername = userInput.toLowerCase().trim();

      const { data: userRow } = await supabaseClient
        .from("users")
        .select("*")
        .ilike("username", cleanUsername)
        .maybeSingle();

      if (!userRow) {
        return showErr("login-err-email", "Username not found.");
      }

      emailToUse = userRow.email;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (error) {
      return showErr("login-err-password", error.message);
    }

    window.location.href = "homepage.html";
  });
}

/* ---------------------------------------------------------
   SOCIAL AUTH
---------------------------------------------------------- */
function initSocialAuth() {
  const redirectUrl = "http://localhost:5500/pages/login.html";

  const googleBtn = document.getElementById("google-btn");
  if (googleBtn)
    googleBtn.onclick = () =>
      supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });

  const githubBtn = document.getElementById("github-btn");
  if (githubBtn)
    githubBtn.onclick = () =>
      supabaseClient.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: redirectUrl },
      });

  const discordBtn = document.getElementById("discord-btn");
  if (discordBtn)
    discordBtn.onclick = () =>
      supabaseClient.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: redirectUrl, scopes: "identify email" },
      });
}

/* ---------------------------------------------------------
   OAUTH CALLBACK → INSERT USER IF NEW
---------------------------------------------------------- */
async function handleOAuthCallback() {
  const { data } = await supabaseClient.auth.getUser();
  if (!data?.user) return;

  const user = data.user;
  const provider = user.app_metadata?.provider;

  const fullName =
    user.user_metadata.full_name ||
    user.user_metadata.name ||
    user.user_metadata.global_name ||
    null;

  let username =
    user.user_metadata.username ||
    user.user_metadata.user_name ||
    (user.email ? user.email.split("@")[0] : null);

  const cleanUsername = username.toLowerCase();

  let avatar =
    user.user_metadata.avatar_url ||
    user.user_metadata.picture ||
    null;

  // Discord avatar
  if (provider === "discord" && user.user_metadata.avatar)
    avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.user_metadata.avatar}.png`;

  const email = user.email;

  // Already exists?
  const { data: exists } = await supabaseClient
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (exists) {
    window.location.href = "homepage.html";
    return;
  }

  // Insert new OAuth user
  await supabaseClient.from("users").insert({
    id: user.id,
    full_name: fullName,
    username: cleanUsername,
    email,
    provider,
    avatar,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  window.location.href = "homepage.html";
}




/* ---------------------------------------------------------
   INIT (only run OAuth handler when returning from provider)
---------------------------------------------------------- */
window.addEventListener("DOMContentLoaded", async () => {
  initSignup();
  initLogin();
  initSocialAuth();

  //  Convert hash (#token) to normal query (?token)
  if (window.location.hash && window.location.hash.length > 0) {
    const newUrl = window.location.href.replace("#", "?");
    window.history.replaceState(null, "", newUrl);
  }
  const url = window.location.href;
  //  Detect ALL OAuth responses (Google, GitHub, Discord)
  const isOAuthCallback =
    url.includes("code=") ||
    url.includes("access_token=") ||
    url.includes("refresh_token=") ||
    url.includes("provider=");

  if (isOAuthCallback) {
    console.log("🌐 OAuth callback detected");
    await handleOAuthCallback();
  }
});



