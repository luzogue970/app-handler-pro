import fs from "fs";
import path from "path";

const CODE_EXTS = [
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".java",
  ".kt",
  ".go",
  ".rs",
  ".php",
  ".cs",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".html",
];

function fileExists(repoPath, file) {
  return fs.existsSync(path.join(repoPath, file));
}

function readJSON(repoPath, file) {
  try {
    const full = path.join(repoPath, file);
    if (!fs.existsSync(full)) return null;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return null;
  }
}

function listFiles(repoPath) {
  try {
    return fs.readdirSync(repoPath);
  } catch {
    return [];
  }
}

const ANCESTOR_MARKERS = [
  "package.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "go.mod",
  "Cargo.toml",
  "pyproject.toml",
  "pom.xml",
  "composer.json",
  ".git",
  ".hg",
  ".svn",
  "angular.json",
  "nuxt.config.js",
  "next.config.js",
];

function findAncestorWithMarker(repoPath, maxLevels = 3) {
  try {
    let cur = path.resolve(repoPath);
    for (let i = 0; i < maxLevels; i++) {
      const parent = path.dirname(cur);
      if (!parent || parent === cur) break;

      try {
        const names = fs.readdirSync(parent);
        for (const m of ANCESTOR_MARKERS) {
          if (names.includes(m)) return parent;

          if (
            (m === ".git" || m === ".hg" || m === ".svn") &&
            names.includes(m)
          )
            return parent;
        }
      } catch {}
      cur = parent;
    }
  } catch {}
  return null;
}

function hasFrontendEntryInSrc(repoPath) {
  const candidates = [
    path.join("src", "index.js"),
    path.join("src", "index.jsx"),
    path.join("src", "index.tsx"),
    path.join("src", "main.jsx"),
    path.join("src", "main.tsx"),
    path.join("src", "main.js"),
    path.join("src", "main.ts"),
  ];
  for (const c of candidates) {
    if (fileExists(repoPath, c)) return true;
  }
  return false;
}

function detectPackageManager(repoPath, pkg = {}) {
  try {
    if (typeof pkg.packageManager === "string") {
      if (pkg.packageManager.startsWith("pnpm")) return "pnpm";
      if (pkg.packageManager.startsWith("yarn")) return "yarn";
      if (pkg.packageManager.startsWith("bun")) return "bun";
    }
  } catch {}

  if (fileExists(repoPath, "pnpm-lock.yaml")) return "pnpm";
  if (fileExists(repoPath, "yarn.lock")) return "yarn";
  if (fileExists(repoPath, "bun.lockb")) return "bun";
  if (fileExists(repoPath, "package-lock.json")) return "npm";
  return "npm";
}

function pmRun(pm, script) {
  if (!pm || pm === "npm")
    return script === "start" ? "npm start" : `npm run ${script}`;
  if (pm === "yarn")
    return script === "start" ? "yarn start" : `yarn ${script}`;
  if (pm === "pnpm")
    return script === "start" ? "pnpm start" : `pnpm run ${script}`;
  if (pm === "bun")
    return script === "start" ? "bun start" : `bun run ${script}`;
  return `npm run ${script}`;
}

function hasCodeFilesIn(dir) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      if (it.isFile()) {
        const ext = path.extname(it.name).toLowerCase();
        if (CODE_EXTS.includes(ext)) return true;
        if (["Makefile", "Dockerfile"].includes(it.name)) return true;
      } else if (
        it.isDirectory() &&
        ["src", "app", "backend", "frontend", "server", "client"].includes(
          it.name
        )
      ) {
        try {
          const c = fs.readdirSync(path.join(dir, it.name));
          if (c.some((f) => CODE_EXTS.includes(path.extname(f).toLowerCase())))
            return true;
        } catch {}
      }
    }
  } catch {}
  return false;
}

function preferScripts(scripts, pm, names = []) {
  const out = [];
  for (const s of names) if (scripts && scripts[s]) out.push(pmRun(pm, s));
  return out;
}

export function detectProjectType(repoPath) {
  const ancestor = findAncestorWithMarker(repoPath, 3);
  if (ancestor && path.resolve(ancestor) !== path.resolve(repoPath)) {
    return { type: "unknown", launchCommands: [] };
  }

  if (fileExists(repoPath, "package.json")) {
    const pkg = readJSON(repoPath, "package.json") || {};
    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    const scripts = pkg.scripts || {};
    const pm = detectPackageManager(repoPath, pkg);

    const run = (s) =>
      s === "start"
        ? pm === "npm"
          ? "npm start"
          : `${pm} start`
        : pmRun(pm, s);

    const candidates = [];
    let type = "node";

    if (
      deps.electron ||
      Object.keys(scripts).some((k) => /electron/i.test(k))
    ) {
      type = "electron";
      candidates.push(
        ...preferScripts(scripts, pm, [
          "dev",
          "start",
          "electron",
          "electron:serve",
          "electron-dev",
        ])
      );
      candidates.push("npx electron .", pmRun(pm, "dev"));
      return {
        type,
        launchCommands: Array.from(new Set(candidates)).slice(0, 5),
      };
    }

    if (
      deps.next ||
      listFiles(repoPath).some(
        (f) =>
          /^next\.config\./i.test(f) ||
          f === ".next" ||
          f === "pages" ||
          f === "app"
      )
    ) {
      type = "nextjs";
      candidates.push(...preferScripts(scripts, pm, ["dev", "start", "next"]));
      candidates.push(`${pm} exec next dev`, pmRun(pm, "dev"));
      return {
        type,
        launchCommands: Array.from(new Set(candidates)).slice(0, 5),
      };
    }

    if (
      deps.nuxt ||
      deps.nuxt3 ||
      listFiles(repoPath).some(
        (f) => /^nuxt\.config\./i.test(f) || f === ".nuxt"
      )
    ) {
      type = "nuxt";
      candidates.push(...preferScripts(scripts, pm, ["dev", "start", "build"]));
      candidates.push("npx nuxi dev", pmRun(pm, "dev"));
      return {
        type,
        launchCommands: Array.from(new Set(candidates)).slice(0, 5),
      };
    }

    const hasReactDeps = deps.react && deps["react-dom"];
    const hasFrontEntry = hasFrontendEntryInSrc(repoPath);
    if ((hasReactDeps || hasFrontEntry) && !deps.next) {
      type = "react";
      candidates.push(
        ...preferScripts(scripts, pm, ["dev", "start", "serve", "preview"])
      );
      candidates.push(pmRun(pm, "dev"), pmRun(pm, "start"));
      return {
        type,
        launchCommands: Array.from(new Set(candidates)).slice(0, 5),
      };
    }

    if (
      deps.vue ||
      listFiles(repoPath).some(
        (f) => /vite\.config\./i.test(f) || /vue\.config\./i.test(f)
      )
    ) {
      if (!deps.nuxt) {
        type = "vue";
        candidates.push(
          ...preferScripts(scripts, pm, ["dev", "serve", "start"])
        );
        candidates.push(pmRun(pm, "dev"), pmRun(pm, "serve"));
        return {
          type,
          launchCommands: Array.from(new Set(candidates)).slice(0, 5),
        };
      }
    }

    if (deps["@angular/core"] || fileExists(repoPath, "angular.json")) {
      type = "angular";
      candidates.push(...preferScripts(scripts, pm, ["start", "dev"]));
      candidates.push("npx ng serve", pmRun(pm, "start"));
      return {
        type,
        launchCommands: Array.from(new Set(candidates)).slice(0, 5),
      };
    }

    if (
      deps.svelte ||
      deps["@sveltejs/kit"] ||
      listFiles(repoPath).some((f) => /\.svelte$/i.test(f))
    ) {
      type = "svelte";
      candidates.push(
        ...preferScripts(scripts, pm, ["dev", "start", "preview"])
      );
      candidates.push(pmRun(pm, "dev"), pmRun(pm, "start"));
      return {
        type,
        launchCommands: Array.from(new Set(candidates)).slice(0, 5),
      };
    }

    if (
      deps.express ||
      deps.koa ||
      deps.fastify ||
      deps.nestjs ||
      fileExists(repoPath, "server.js") ||
      fileExists(repoPath, "app.js") ||
      fileExists(repoPath, "index.js") ||
      fileExists(repoPath, "index.ts") ||
      hasCodeFilesIn(repoPath)
    ) {
      type = "node";
      candidates.push(
        ...preferScripts(scripts, pm, ["dev", "start", "serve", "api"])
      );
      candidates.push("npx nodemon .", "node .");
      return {
        type,
        launchCommands: Array.from(new Set(candidates)).slice(0, 5),
      };
    }

    candidates.push(pmRun(pm, "dev"), pmRun(pm, "start"));
    return {
      type: "node",
      launchCommands: Array.from(new Set(candidates)).slice(0, 5),
    };
  }

  if (
    fileExists(repoPath, "go.mod") ||
    listFiles(repoPath).some((f) => f.endsWith(".go"))
  ) {
    return {
      type: "go",
      launchCommands: [
        "go run .",
        "go run ./cmd/...",
        "go build -o app && ./app",
        "air",
        "go test ./...",
      ].slice(0, 5),
    };
  }

  if (
    fileExists(repoPath, "pyproject.toml") ||
    fileExists(repoPath, "requirements.txt") ||
    fileExists(repoPath, "Pipfile") ||
    fileExists(repoPath, "manage.py")
  ) {
    if (fileExists(repoPath, "manage.py")) {
      return {
        type: "django",
        launchCommands: [
          "python manage.py runserver",
          "python3 manage.py runserver",
          "poetry run python manage.py runserver",
          "pipenv run python manage.py runserver",
          "gunicorn project:app",
        ].slice(0, 5),
      };
    }
    return {
      type: "python",
      launchCommands: [
        "flask run",
        "python app.py",
        "python main.py",
        "uvicorn main:app --reload",
        "uvicorn app:app --reload",
      ].slice(0, 5),
    };
  }

  if (
    fileExists(repoPath, "pom.xml") ||
    fileExists(repoPath, "build.gradle") ||
    fileExists(repoPath, "build.gradle.kts")
  ) {
    const hasMvnw = fileExists(repoPath, "mvnw");
    const hasGradlew = fileExists(repoPath, "gradlew");

    try {
      const pom = fs.readFileSync(path.join(repoPath, "pom.xml"), "utf8");
      if (/spring-boot-starter/i.test(pom)) {
        const mvn = hasMvnw ? "./mvnw" : "mvn";
        return {
          type: "spring-boot",
          launchCommands: [
            `${mvn} spring-boot:run`,
            `${mvn} clean spring-boot:run`,
            "./gradlew bootRun",
            "gradle bootRun",
          ].slice(0, 5),
        };
      }
    } catch {}
    const gradleCmd = hasGradlew ? "./gradlew" : "gradle";
    return {
      type: "java",
      launchCommands: [
        hasMvnw ? "./mvnw exec:java" : "mvn exec:java",
        `${gradleCmd} run`,
        "java -jar target/*.jar",
      ].slice(0, 5),
    };
  }

  if (
    fileExists(repoPath, "Cargo.toml") ||
    listFiles(repoPath).some((f) => f.endsWith(".rs"))
  ) {
    return {
      type: "rust",
      launchCommands: [
        "cargo run",
        "cargo build && cargo run",
        "cargo watch -x run",
        "cargo test",
      ].slice(0, 5),
    };
  }

  try {
    const names = listFiles(repoPath);
    if (
      names.some(
        (n) =>
          n.endsWith(".sln") || n.endsWith(".csproj") || n.endsWith(".fsproj")
      )
    ) {
      return {
        type: "dotnet",
        launchCommands: [
          "dotnet run",
          "dotnet watch run",
          "dotnet build && dotnet run",
        ].slice(0, 5),
      };
    }
  } catch {}

  if (fileExists(repoPath, "composer.json")) {
    return {
      type: "php",
      launchCommands: [
        "php artisan serve",
        "composer run dev",
        "symfony serve",
        "php -S localhost:8000 -t public",
      ].slice(0, 5),
    };
  }

  if (
    fileExists(repoPath, "docker-compose.yml") ||
    fileExists(repoPath, "docker-compose.yaml") ||
    fileExists(repoPath, "compose.yml") ||
    fileExists(repoPath, "compose.yaml")
  ) {
    return {
      type: "docker-compose",
      launchCommands: ["docker compose up", "docker-compose up"].slice(0, 5),
    };
  }

  if (fileExists(repoPath, "Makefile")) {
    return {
      type: "make",
      launchCommands: ["make dev", "make run", "make start", "make up"].slice(
        0,
        5
      ),
    };
  }

  if (listFiles(repoPath).some((f) => /\.html?$/i.test(f))) {
    const htmls = listFiles(repoPath).filter((f) => /\.html?$/i.test(f));
    const preferred = htmls.includes("index.html") ? "index.html" : htmls[0];
    let openCmd =
      process.platform === "win32"
        ? `cmd /c start "" "${preferred}"`
        : process.platform === "darwin"
        ? `open "${preferred}"`
        : `xdg-open "${preferred}"`;
    return {
      type: "static-html",
      launchCommands: [
        openCmd,
        "python -m http.server 5173",
        "npx serve -s .",
      ].slice(0, 5),
    };
  }

  return { type: "unknown", launchCommands: [] };
}
