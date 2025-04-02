// Cache de elementos DOM
const domElements = {
  teamsList: document.getElementById("teamsList"),
  penaltyHistory: document.getElementById("penaltyHistory"),
  activeRequests: document.getElementById("activeRequests"),
  activeLoans: document.getElementById("activeLoans"),
  penaltyDisplay: document.getElementById("penaltyDisplay"),
  connectionStatus: document.getElementById("connectionStatus"),
  lastUpdate: document.getElementById("lastUpdate"),
};

// Estado anterior para comparação
let previousState = {
  teams: null,
  recentPenalties: null,
  urgentRequests: null,
  activePenalty: null,
  isSimulationRunning: null,
  lastUpdate: null,
  activeLoans: null,
};

// Timestamps para controle de atualização
let lastPenaltyUpdate = 0;
let lastRequestsUpdate = 0;
let lastBatchUpdate = 0;
const PENALTY_UPDATE_INTERVAL = 60000; // 1 minuto em milissegundos
const REQUESTS_UPDATE_INTERVAL = 60000; // 1 minuto
const BATCH_UPDATE_INTERVAL = 60000; // 1 minuto

// Formatação de tempo (segundos para HH:MM)
function formatTime(totalSeconds) {
  totalSeconds = Math.round(totalSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

// Formatação de tempo para empréstimos (MM:SS)
function formatLoanTime(seconds) {
  seconds = Math.round(seconds);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

// Atualiza apenas os timers das equipes (otimizado)
function updateTeamTimers(teams) {
  if (!teams) return;

  teams.forEach((team) => {
    const timerElement = document.querySelector(`#timer-${team.name}`);
    if (timerElement) {
      timerElement.textContent = formatTime(team.time);

      // Atualiza a cor apenas se necessário
      const isCritical = team.time < 3600;
      const isCurrentlyCritical =
        timerElement.classList.contains("text-danger");

      if (isCritical && !isCurrentlyCritical) {
        timerElement.classList.remove("text-dark");
        timerElement.classList.add("text-danger");
      } else if (!isCritical && isCurrentlyCritical) {
        timerElement.classList.remove("text-danger");
        timerElement.classList.add("text-dark");
      }
    }
  });
}

// Atualiza a lista de equipes (com preservação de estado dos inputs)
function updateTeamsList(teams, isSimulationRunning) {
  if (!teams) return;

  // Preserva os valores dos inputs antes de atualizar
  const inputsState = {};
  teams.forEach((team) => {
    const timeInput = document.querySelector(`#timeIncrement-${team.name}`);
    const moneyInput = document.querySelector(`#moneyIncrement-${team.name}`);
    if (timeInput) inputsState[`time-${team.name}`] = timeInput.value;
    if (moneyInput) inputsState[`money-${team.name}`] = moneyInput.value;
  });

  domElements.teamsList.innerHTML = teams
    .map(
      (team) => `
        <div class="col-md-6">
            <div class="team-card">
                <div class="d-flex justify-content-between align-items-start">
                    <h3>${team.name}</h3>
                    <span class="badge bg-${
                      isSimulationRunning ? "success" : "secondary"
                    }">
                        ${isSimulationRunning ? "Ativa" : "Inativa"}
                    </span>
                </div>
                
                <p><i class="fas fa-user-tie me-2 text-primary"></i><strong>Scrum Master:</strong> ${
                  team.scrumMaster
                }</p>
                <p><i class="fas fa-user-check me-2 text-primary"></i><strong>Product Owner:</strong> ${
                  team.productOwner
                }</p>
                <p><i class="fas fa-laptop-code me-2 text-primary"></i><strong>Frontend:</strong> ${
                  team.frontendDev
                }</p>
                <p><i class="fas fa-server me-2 text-primary"></i><strong>Backend:</strong> ${
                  team.backendDev
                }</p>
                <p><i class="fas fa-paint-brush me-2 text-primary"></i><strong>Designer:</strong> ${
                  team.designer
                }</p>
                
                <div class="team-meta mt-3">
                    <div>
                        <span id="timer-${team.name}" class="display-6 ${
        team.time < 3600 ? "text-danger" : "text-dark"
      }">${formatTime(team.time)}</span>
                        <small>Tempo Restante</small>
                    </div>
                    <div>
                        <span id="money-${
                          team.name
                        }" class="display-6">R$ ${team.money.toLocaleString(
        "pt-BR"
      )}</span>
                        <small>Orçamento</small>
                    </div>
                </div>
                
                <div class="mt-3">
                    <h5><i class="fas fa-tasks me-2"></i>Demandas Ativas</h5>
                    <div id="requests-${team.name}" class="mt-2">
                        ${
                          team.activeRequests?.length > 0
                            ? team.activeRequests
                                .map(
                                  (req) => `
                                    <div class="alert alert-warning py-2 px-3 mb-2">
                                        <div class="d-flex justify-content-between">
                                            <span>${req.description}</span>
                                            <strong>${req.time} min</strong>
                                        </div>
                                    </div>
                                `
                                )
                                .join("")
                            : '<p class="text-muted small">Nenhuma demanda ativa</p>'
                        }
                    </div>
                </div>
            </div>
        </div>
    `
    )
    .join("");

  // Restaura os valores dos inputs após a atualização
  teams.forEach((team) => {
    const timeInput = document.querySelector(`#timeIncrement-${team.name}`);
    const moneyInput = document.querySelector(`#moneyIncrement-${team.name}`);
    if (timeInput) timeInput.value = inputsState[`time-${team.name}`] || "";
    if (moneyInput) moneyInput.value = inputsState[`money-${team.name}`] || "";
  });
}

// Atualiza a lista de empréstimos ativos
function updateActiveLoans(activeLoans) {
  if (!activeLoans || activeLoans.length === 0) {
    domElements.activeLoans.innerHTML =
      '<p class="text-muted">Nenhum empréstimo ativo no momento</p>';
    return;
  }

  const loansHTML = activeLoans
    .map(
      (loan) => `
      <div class="loan-item mb-3 p-3 border rounded bg-light">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h5 class="mb-1"><i class="fas fa-user me-2"></i>${
              loan.employeeName
            }</h5>
            <p class="mb-1"><strong><i class="fas fa-building me-2"></i>Empresa Solicitante:</strong> ${
              loan.requestingCompany
            }</p>
            <p class="small text-muted"><i class="fas fa-clock me-2"></i>Iniciado em: ${new Date(
              loan.addedAt
            ).toLocaleTimeString()}</p>
          </div>
          <div class="loan-time ${
            loan.remainingTime < 300 ? "text-danger" : "text-success"
          }">
            ${formatLoanTime(loan.remainingTime)}
          </div>
        </div>
      </div>
    `
    )
    .join("");

  domElements.activeLoans.innerHTML = loansHTML;
}

// Verifica demandas expiradas
function checkExpiredRequests(urgentRequests) {
  const now = new Date();
  return urgentRequests.filter((request) => {
    const requestEndTime = new Date(request.addedAt);
    requestEndTime.setMinutes(requestEndTime.getMinutes() + request.time);
    return now < requestEndTime;
  });
}

// Atualiza o histórico de penalidades
function updatePenaltyHistory(recentPenalties) {
  if (!recentPenalties) return;

  domElements.penaltyHistory.innerHTML = `
    <h3><i class="fas fa-history me-2"></i>Histórico de Eventos</h3>
    <ul class="mt-3">
        ${
          recentPenalties.length > 0
            ? recentPenalties
                .map(
                  (penalty) => `
                  <li class="fade-in">
                      <div class="d-flex justify-content-between">
                          <div>
                              <strong class="text-primary">${
                                penalty.teamName
                              }</strong> |
                              <span class="text-muted">${penalty.memberName} (${
                    penalty.memberRole
                  })</span>
                          </div>
                          <small class="text-muted">${new Date(
                            penalty.timestamp
                          ).toLocaleTimeString()}</small>
                      </div>
                      <div class="mt-1">${penalty.penalty}</div>
                  </li>
              `
                )
                .join("")
            : '<p class="text-muted">Nenhum evento registrado ainda</p>'
        }
    </ul>
  `;
}

// Modificado para usar timestamp de cache
function updateActiveRequests(urgentRequests, forceUpdate = false) {
  if (!urgentRequests) return;

  const now = Date.now();

  // Só atualiza se passou 1 minuto ou se for forçado
  if (!forceUpdate && now - lastRequestsUpdate < REQUESTS_UPDATE_INTERVAL) {
    return;
  }

  lastRequestsUpdate = now;

  domElements.activeRequests.innerHTML =
    urgentRequests.length > 0
      ? urgentRequests
          .map(
            (request) => `
            <div class="request-item">
                <div class="request-info">
                    <strong>${request.description}</strong>
                    <small class="text-muted d-block">Adicionado em ${new Date(
                      request.addedAt
                    ).toLocaleTimeString()}</small>
                </div>
                <div class="request-time">${request.time} min</div>
            </div>
        `
          )
          .join("")
      : '<p class="text-muted">Nenhuma demanda ativa no momento</p>';
}

// Atualiza a penalidade ativa
function showPenalty(activePenalty) {
  if (!activePenalty) {
    domElements.penaltyDisplay.innerHTML = `
      <div class="text-center py-4 text-muted">
          <i class="fas fa-check-circle fa-3x mb-3"></i>
          <h4>Nenhuma penalidade ativa no momento</h4>
          <p>A próxima penalidade será aplicada automaticamente</p>
      </div>
    `;
    return;
  }

  const isBonus = activePenalty.penalty.includes("BÔNUS:");
  domElements.penaltyDisplay.innerHTML = `
    <div class="${isBonus ? "bonus-card" : "penalty-card"} fade-in">
        <h3><i class="fas ${
          isBonus ? "fa-gift" : "fa-exclamation-triangle"
        } me-2"></i>${isBonus ? "Bônus Concedido!" : "Penalidade Aplicada"}</h3>
        <div class="mt-3">
            <p><strong><i class="fas fa-users me-2"></i>Equipe:</strong> ${
              activePenalty.teamName
            }</p>
            <p><strong><i class="fas fa-user me-2"></i>Membro:</strong> ${
              activePenalty.memberName
            } (${activePenalty.memberRole})</p>
            <p class="mt-3 alert alert-${isBonus ? "success" : "danger"}">
                <strong><i class="fas ${
                  isBonus ? "fa-star" : "fa-bolt"
                } me-2"></i>${
    isBonus ? "Bônus" : "Penalidade"
  }:</strong> ${activePenalty.penalty.replace("BÔNUS: ", "")}
            </p>
        </div>
    </div>
  `;

  // Efeito visual
  domElements.penaltyDisplay.classList.add("pulse");
  setTimeout(() => {
    domElements.penaltyDisplay.classList.remove("pulse");
  }, 500);
}

// Atualiza o status da conexão
function updateConnectionStatus(lastUpdate) {
  const now = new Date();
  const updateTime = new Date(lastUpdate);
  const secondsDiff = Math.floor((now - updateTime) / 1000);

  domElements.lastUpdate.textContent = updateTime.toLocaleTimeString();

  if (secondsDiff > 10) {
    domElements.connectionStatus.className = "badge bg-danger";
    domElements.connectionStatus.innerHTML =
      '<i class="fas fa-unlink me-1"></i> Desconectado';
  } else if (secondsDiff > 5) {
    domElements.connectionStatus.className = "badge bg-warning";
    domElements.connectionStatus.innerHTML =
      '<i class="fas fa-exclamation-triangle me-1"></i> Conexão instável';
  } else {
    domElements.connectionStatus.className = "badge bg-success";
    domElements.connectionStatus.innerHTML =
      '<i class="fas fa-check-circle me-1"></i> Conectado';
  }
}

// Carrega e atualiza os dados de forma otimizada
function loadAndUpdateData() {
  try {
    const appState =
      JSON.parse(localStorage.getItem("scrumSimulatorData")) || {};
    let {
      teams = [],
      recentPenalties = [],
      urgentRequests = [],
      activePenalty = null,
      isSimulationRunning = false,
      lastUpdate = new Date().toISOString(),
      activeLoans = [],
    } = appState;

    const now = Date.now();

    // Atualiza o tempo restante dos empréstimos
    activeLoans = activeLoans
      .map((loan) => {
        const addedAt = new Date(loan.addedAt);
        const elapsedSeconds = (now - addedAt.getTime()) / 1000;
        const remainingTime = Math.max(0, loan.time * 60 - elapsedSeconds);

        return {
          ...loan,
          remainingTime: remainingTime,
          addedAt: addedAt,
        };
      })
      .filter((loan) => loan.remainingTime > 0);

    // Filtrar demandas expiradas
    urgentRequests = checkExpiredRequests(urgentRequests);
    teams.forEach((team) => {
      if (team.activeRequests) {
        team.activeRequests = checkExpiredRequests(team.activeRequests);
      }
    });

    // Atualizações que devem ocorrer sempre (frequentes)
    updateTeamsList(teams, isSimulationRunning);
    updateTeamTimers(teams);
    updateActiveLoans(activeLoans);
    updateConnectionStatus(lastUpdate);

    // Atualizações em lote (a cada 1 minuto)
    if (now - lastBatchUpdate > BATCH_UPDATE_INTERVAL) {
      updatePenaltyHistory(recentPenalties);
      showPenalty(activePenalty);
      updateActiveRequests(urgentRequests, true); // Força atualização
      lastBatchUpdate = now;
    }

    // Atualiza o estado anterior
    previousState = {
      teams: [...teams],
      recentPenalties: [...recentPenalties],
      urgentRequests: [...urgentRequests],
      activePenalty: activePenalty ? { ...activePenalty } : null,
      isSimulationRunning,
      lastUpdate,
      activeLoans: [...activeLoans],
    };
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
  }
}

// Monitora mudanças no localStorage
window.addEventListener("storage", function (event) {
  if (event.key === "scrumSimulatorData") {
    loadAndUpdateData();
  }
});

// Configura o IntersectionObserver para otimizar quando a janela não está visível
let isWindowVisible = true;
const visibilityObserver = new IntersectionObserver(
  (entries) => {
    isWindowVisible = entries[0].isIntersecting;
  },
  { threshold: 0.1 }
);

// Observa o container principal
const mainContainer = document.querySelector(".container");
if (mainContainer) {
  visibilityObserver.observe(mainContainer);
}

// Atualiza os dados periodicamente (com otimização quando a janela não está visível)
function optimizedUpdate() {
  if (isWindowVisible) {
    loadAndUpdateData();
    setTimeout(optimizedUpdate, 1000); // Atualiza a cada 1s quando visível
  } else {
    setTimeout(optimizedUpdate, 5000); // Atualiza a cada 5s quando oculto
  }
}

// Inicia o ciclo de atualização
document.addEventListener("DOMContentLoaded", function () {
  loadAndUpdateData();
  optimizedUpdate();
});
