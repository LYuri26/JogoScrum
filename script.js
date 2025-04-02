// Importando as penalidades específicas
import { scrumMasterPenalties } from "./penalidades/scrummaster.js";
import { productOwnerPenalties } from "./penalidades/productowner.js";
import { frontendDevPenalties } from "./penalidades/desenvolvedorfrontend.js";
import { backendDevPenalties } from "./penalidades/desenvolvedorbackend.js";
import { designerPenalties } from "./penalidades/designer.js";
import { generalPenalties } from "./penalidades/gerais.js";
import { bonuses } from "./penalidades/bonus.js";

document.addEventListener("DOMContentLoaded", function () {
  // Elementos do DOM
  const teamForm = document.getElementById("teamForm");
  const teamsList = document.getElementById("teamsList");
  const startButton = document.getElementById("startButton");
  const resetButton = document.getElementById("resetButton");
  const penaltyDisplay = document.getElementById("penaltyDisplay");
  const penaltyHistory = document.getElementById("penaltyHistory");
  const addRequestBtn = document.getElementById("addRequestBtn");
  const urgentRequest = document.getElementById("urgentRequest");
  const requestTime = document.getElementById("requestTime");
  const activeRequests = document.getElementById("activeRequests");

  // Toast
  const toastEl = document.getElementById("liveToast");
  const toast = new bootstrap.Toast(toastEl);
  const toastTitle = document.getElementById("toastTitle");
  const toastMessage = document.getElementById("toastMessage");

  // Estado da aplicação
  let teams = [];
  let recentPenalties = [];
  let activeLoans = [];
  let urgentRequests = [];
  let penaltyTimer = null;
  let penaltyCycleInterval = null;
  let isSimulationRunning = false;

  // Elementos do formulário de empréstimo
  const loanForm = document.getElementById("loanForm");
  const loansList = document.getElementById("loansList");

  // Adicionar empréstimo
  loanForm.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!loanForm.checkValidity()) {
      e.stopPropagation();
      loanForm.classList.add("was-validated");
      return;
    }

    const loan = {
      id: Date.now(),
      employeeName: document.getElementById("employeeName").value,
      requestingCompany: document.getElementById("requestingCompany").value,
      originCompany: document.getElementById("originCompany").value,
      position: document.getElementById("employeePosition").value,
      time: parseInt(document.getElementById("loanTime").value),
      remainingTime: parseInt(document.getElementById("loanTime").value) * 60, // Converter para segundos
      addedAt: new Date(),
      timerInterval: null,
    };

    activeLoans.push(loan);
    updateLoansList();
    loanForm.reset();
    loanForm.classList.remove("was-validated");

    // Iniciar timer para este empréstimo
    startLoanTimer(loan);

    showNotification(
      "Empréstimo Adicionado",
      `Empréstimo de ${loan.employeeName} registrado por ${loan.time} minutos.`,
      "success"
    );
  });

  // Função para iniciar o timer de um empréstimo
  function startLoanTimer(loan) {
    if (loan.timerInterval) {
      clearInterval(loan.timerInterval);
    }

    loan.timerInterval = setInterval(() => {
      loan.remainingTime--;

      // Salva o estado atualizado a cada segundo
      saveLoansToLocalStorage();

      if (loan.remainingTime <= 0) {
        clearInterval(loan.timerInterval);
        loan.timerInterval = null;
        removeLoan(loan.id);
        showNotification(
          "Empréstimo Finalizado",
          `O tempo de empréstimo de ${loan.employeeName} expirou.`,
          "info"
        );
      } else {
        updateLoanDisplay(loan);
      }
    }, 1000);
  }

  // Função para remover um empréstimo
  function removeLoan(loanId) {
    const loanIndex = activeLoans.findIndex((loan) => loan.id === loanId);
    if (loanIndex !== -1) {
      const loan = activeLoans[loanIndex];
      if (loan.timerInterval) {
        clearInterval(loan.timerInterval);
      }
      activeLoans.splice(loanIndex, 1);
      updateLoansList();
    }
  }

  // Função para atualizar a exibição de um empréstimo
  function updateLoanDisplay(loan) {
    const loanElement = document.getElementById(`loan-${loan.id}`);
    if (loanElement) {
      const timeElement = loanElement.querySelector(".loan-time");
      if (timeElement) {
        timeElement.textContent = formatLoanTime(loan.remainingTime);

        // Mudar cor se o tempo estiver acabando (menos de 5 minutos)
        if (loan.remainingTime < 300) {
          timeElement.classList.remove("text-success");
          timeElement.classList.add("text-danger");
        } else {
          timeElement.classList.remove("text-danger");
          timeElement.classList.add("text-success");
        }
      }
    }
  }

  // Função para formatar o tempo do empréstimo
  function formatLoanTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  // Função para atualizar a lista de empréstimos
  function updateLoansList() {
    loansList.innerHTML = "";

    if (activeLoans.length === 0) {
      loansList.innerHTML = `
            <div class="col-12 text-center py-3 text-muted">
                <i class="fas fa-exchange-alt fa-2x mb-2"></i>
                <p>Nenhum empréstimo ativo no momento</p>
            </div>
        `;
      return;
    }

    activeLoans.forEach((loan) => {
      const loanCard = document.createElement("div");
      loanCard.className = "col-md-6";
      loanCard.id = `loan-${loan.id}`;
      loanCard.innerHTML = `
            <div class="loan-card">
                <div class="d-flex justify-content-between align-items-start">
                    <h5>${loan.employeeName}</h5>
                    <span class="loan-time text-success">${formatLoanTime(
                      loan.remainingTime
                    )}</span>
                </div>
                <div class="loan-details">
                    <p><strong>Cargo:</strong> ${loan.position}</p>
                    <p><strong>Empresa Solicitante:</strong> ${
                      loan.requestingCompany
                    }</p>
                    <p><strong>Empresa de Origem:</strong> ${
                      loan.originCompany
                    }</p>
                    <p class="small text-muted">Iniciado em: ${loan.addedAt.toLocaleTimeString()}</p>
                </div>
                <button class="btn btn-sm btn-outline-danger w-100" onclick="removeLoan(${
                  loan.id
                })">
                    <i class="fas fa-times me-2"></i>Remover
                </button>
            </div>
        `;
      loansList.appendChild(loanCard);
    });
  }

  // Adicione esta função ao objeto window para ser acessível globalmente
  window.removeLoan = removeLoan;

  // Função para mostrar notificação
  function showNotification(title, message, type = "info") {
    toastTitle.textContent = title;
    toastMessage.textContent = message;

    // Reset classes
    toastEl.querySelector(".toast-header").className = "toast-header";
    toastEl.querySelector(".toast-header").classList.add("text-white");

    // Adicionar classe baseada no tipo
    if (type === "success") {
      toastEl.querySelector(".toast-header").classList.add("bg-success");
    } else if (type === "warning") {
      toastEl.querySelector(".toast-header").classList.add("bg-warning");
    } else if (type === "danger") {
      toastEl.querySelector(".toast-header").classList.add("bg-danger");
    } else if (type === "info") {
      toastEl.querySelector(".toast-header").classList.add("bg-info");
    } else {
      toastEl.querySelector(".toast-header").classList.add("bg-primary");
    }

    toast.show();
  }

  // Adicionar equipe
  teamForm.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!teamForm.checkValidity()) {
      e.stopPropagation();
      teamForm.classList.add("was-validated");
      return;
    }

    const team = {
      name: document.getElementById("teamName").value,
      scrumMaster: document.getElementById("scrumMaster").value,
      productOwner: document.getElementById("productOwner").value,
      frontendDev: document.getElementById("frontendDev").value,
      backendDev: document.getElementById("backendDev").value,
      designer: document.getElementById("designer").value,
      time: 480 * 60, // 8 horas em segundos
      money: 200000,
      penalties: [],
      timerInterval: null,
      lastUpdate: Date.now(),
      activeRequests: [],
    };

    teams.push(team);
    updateTeamsList();
    teamForm.reset();
    teamForm.classList.remove("was-validated");

    showNotification(
      "Equipe Adicionada",
      `A equipe "${team.name}" foi criada com sucesso!`,
      "success"
    );
  });

  // Adicione esta função para verificar e remover demandas expiradas
  function checkAndRemoveExpiredRequests() {
    const now = new Date();

    // Verifica demandas globais
    urgentRequests = urgentRequests.filter((request) => {
      const requestEndTime = new Date(request.addedAt);
      requestEndTime.setMinutes(requestEndTime.getMinutes() + request.time);
      return now < requestEndTime;
    });

    // Verifica demandas em cada equipe
    teams.forEach((team) => {
      if (team.activeRequests && team.activeRequests.length > 0) {
        team.activeRequests = team.activeRequests.filter((request) => {
          const requestEndTime = new Date(request.addedAt);
          requestEndTime.setMinutes(requestEndTime.getMinutes() + request.time);
          return now < requestEndTime;
        });
      }
    });

    updateActiveRequests();
    updateTeamsList();
  }

  // Adicionar demanda repentina
  addRequestBtn.addEventListener("click", function (e) {
    e.preventDefault(); // Isso evita o recarregamento da página

    const description = urgentRequest.value.trim();
    const time = parseInt(requestTime.value);

    if (!description || isNaN(time)) {
      showNotification(
        "Erro",
        "Por favor, preencha todos os campos corretamente.",
        "danger"
      );
      return;
    }

    const requestId = Date.now();
    const request = {
      id: requestId,
      description,
      time,
      addedAt: new Date(),
    };

    urgentRequests.push(request);
    updateActiveRequests(); // Atualiza apenas a lista de demandas ativas

    // Aplicar a todas as equipes
    teams.forEach((team) => {
      team.activeRequests.push({ ...request });
      updateTeamCard(team.name); // Atualiza apenas o card da equipe específica
    });

    urgentRequest.value = "";
    requestTime.value = "";

    showNotification(
      "Demanda Adicionada",
      `Nova demanda do cliente adicionada para todas as equipes: "${description}"`,
      "warning"
    );

    // Configurar timer para remover a demanda quando expirar
    setTimeout(() => {
      // Remove a demanda global
      urgentRequests = urgentRequests.filter((req) => req.id !== requestId);

      // Remove das equipes
      teams.forEach((team) => {
        team.activeRequests = team.activeRequests.filter(
          (req) => req.id !== requestId
        );
        updateTeamCard(team.name); // Atualiza apenas o card da equipe específica
      });

      updateActiveRequests();
    }, time * 60 * 1000); // Converter minutos para milissegundos
  });

  // Nova função para atualizar apenas o card de uma equipe específica
  function updateTeamCard(teamName) {
    const team = teams.find((t) => t.name === teamName);
    if (!team) return;

    const requestsContainer = document.getElementById(`requests-${teamName}`);
    if (requestsContainer) {
      requestsContainer.innerHTML =
        team.activeRequests.length > 0
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
          : '<p class="text-muted small">Nenhuma demanda ativa</p>';
    }
  }

  // Atualizar demandas ativas
  function updateActiveRequests() {
    if (urgentRequests.length === 0) {
      activeRequests.innerHTML =
        '<p class="text-muted">Nenhuma demanda ativa no momento.</p>';
      return;
    }

    // Cria um fragmento de documento para melhor performance
    const fragment = document.createDocumentFragment();

    urgentRequests.forEach((request) => {
      const requestElement = document.createElement("div");
      requestElement.className = "request-item fade-in";
      requestElement.innerHTML = `
      <div class="request-info">
          <strong>${request.description}</strong>
          <small class="text-muted d-block">Adicionado em ${request.addedAt.toLocaleTimeString()}</small>
      </div>
      <div class="request-time">${request.time} min</div>
    `;
      fragment.appendChild(requestElement);
    });

    // Limpa o container e adiciona todos os itens de uma vez
    activeRequests.innerHTML = "";
    activeRequests.appendChild(fragment);
  }
  // Iniciar o gerenciamento de equipes
  startButton.addEventListener("click", function () {
    if (teams.length === 0) {
      showNotification(
        "Atenção",
        "Adicione pelo menos uma equipe antes de iniciar.",
        "warning"
      );
      return;
    }

    if (!isSimulationRunning) {
      isSimulationRunning = true;
      startButton.innerHTML =
        '<i class="fas fa-pause me-2"></i>Pausar Simulação';
      startButton.classList.remove("btn-primary");
      startButton.classList.add("btn-warning");

      teams.forEach((team) => {
        if (!team.timerInterval) {
          startTimer(team);
        }
      });

      startPenaltyCycle();
      showNotification(
        "Simulação Iniciada",
        "O gerenciamento das equipes foi iniciado.",
        "success"
      );
    } else {
      isSimulationRunning = false;
      startButton.innerHTML =
        '<i class="fas fa-play me-2"></i>Continuar Simulação';
      startButton.classList.remove("btn-warning");
      startButton.classList.add("btn-primary");

      teams.forEach((team) => {
        if (team.timerInterval) {
          clearInterval(team.timerInterval);
          team.timerInterval = null;
        }
      });

      if (penaltyCycleInterval) {
        clearInterval(penaltyCycleInterval);
        penaltyCycleInterval = null;
      }

      showNotification(
        "Simulação Pausada",
        "O gerenciamento das equipes foi pausado.",
        "info"
      );
    }
  });

  // Reiniciar simulação
  resetButton.addEventListener("click", function () {
    if (
      confirm(
        "Tem certeza que deseja reiniciar a simulação? Todos os dados serão perdidos."
      )
    ) {
      teams.forEach((team) => {
        if (team.timerInterval) {
          clearInterval(team.timerInterval);
        }
      });

      if (penaltyCycleInterval) {
        clearInterval(penaltyCycleInterval);
      }

      if (penaltyTimer) {
        clearTimeout(penaltyTimer);
      }

      teams = [];
      recentPenalties = [];
      activeLoans = [];
      urgentRequests = [];
      isSimulationRunning = false;

      updateTeamsList();
      updatePenaltyHistory();
      updateActiveRequests();
      clearPenalty();

      startButton.innerHTML =
        '<i class="fas fa-play me-2"></i>Iniciar Simulação';
      startButton.classList.remove("btn-warning");
      startButton.classList.add("btn-primary");

      showNotification(
        "Simulação Reiniciada",
        "Todas as equipes e dados foram resetados.",
        "info"
      );
    }
  });

  // Função para aplicar penalidade específica por cargo
  function applyRandomPenalty() {
    if (teams.length === 0) return;

    const randomTeamIndex = Math.floor(Math.random() * teams.length);
    const team = teams[randomTeamIndex];

    // 20% de chance de penalidade geral
    if (Math.random() < 0.2) {
      const randomPenaltyIndex = Math.floor(
        Math.random() * generalPenalties.length
      );
      const penalty = generalPenalties[randomPenaltyIndex];
      addToPenaltyHistory(team.name, "Equipe", "Todos", penalty);
      showPenalty(team.name, "Equipe", "Todos", penalty);
      showNotification(
        "Penalidade Geral",
        `A equipe ${team.name} recebeu uma penalidade geral!`,
        "danger"
      );
    }
    // 10% de chance de bônus
    else if (Math.random() < 0.1) {
      const randomBonusIndex = Math.floor(Math.random() * bonuses.length);
      const bonus = bonuses[randomBonusIndex];
      addToPenaltyHistory(team.name, "Equipe", "Todos", "BÔNUS: " + bonus);
      showBonus(team.name, "Equipe", "Todos", bonus);
      showNotification(
        "Bônus!",
        `A equipe ${team.name} recebeu um bônus!`,
        "success"
      );
    }
    // 70% de chance de penalidade específica
    else {
      const roles = [
        {
          role: "Scrum Master",
          name: team.scrumMaster,
          penalties: scrumMasterPenalties,
        },
        {
          role: "Product Owner",
          name: team.productOwner,
          penalties: productOwnerPenalties,
        },
        {
          role: "Desenvolvedor Frontend",
          name: team.frontendDev,
          penalties: frontendDevPenalties,
        },
        {
          role: "Desenvolvedor Backend",
          name: team.backendDev,
          penalties: backendDevPenalties,
        },
        {
          role: "Designer UX/UI",
          name: team.designer,
          penalties: designerPenalties,
        },
      ];

      const randomRoleIndex = Math.floor(Math.random() * roles.length);
      const selectedRole = roles[randomRoleIndex];
      const randomPenaltyIndex = Math.floor(
        Math.random() * selectedRole.penalties.length
      );
      const penalty = selectedRole.penalties[randomPenaltyIndex];

      addToPenaltyHistory(
        team.name,
        selectedRole.role,
        selectedRole.name,
        penalty
      );
      showPenalty(team.name, selectedRole.role, selectedRole.name, penalty);

      showNotification(
        "Penalidade Aplicada",
        `${selectedRole.name} (${selectedRole.role}) da equipe ${team.name} recebeu uma penalidade!`,
        "danger"
      );
    }

    // Timer para limpar a penalidade após 10 minutos
    if (penaltyTimer) {
      clearTimeout(penaltyTimer);
    }
    penaltyTimer = setTimeout(() => {
      clearPenalty();
    }, 600000); // 10 minutos em milissegundos
  }

  // Função para iniciar o ciclo de penalidades (a cada 20 minutos)
  function startPenaltyCycle() {
    // Limpar qualquer intervalo existente
    if (penaltyCycleInterval) {
      clearInterval(penaltyCycleInterval);
    }

    // Aplicar a primeira penalidade imediatamente
    applyRandomPenalty();

    // Configurar o intervalo para 20 minutos (1200000 ms)
    penaltyCycleInterval = setInterval(() => {
      applyRandomPenalty();
    }, 300000); // Aplicar penalidade a cada 5 minutos
  }

  // Função para adicionar uma penalidade ao histórico
  function addToPenaltyHistory(teamName, memberRole, memberName, penalty) {
    recentPenalties.unshift({
      teamName,
      memberRole,
      memberName,
      penalty,
      timestamp: new Date(),
    });

    if (recentPenalties.length > 5) {
      recentPenalties.pop();
    }

    updatePenaltyHistory();
  }

  // Função para atualizar o histórico de penalidades
  function updatePenaltyHistory() {
    penaltyHistory.innerHTML = `
            <h3><i class="fas fa-history me-2"></i>Histórico de Eventos</h3>
            <ul class="mt-3">
                ${recentPenalties
                  .map(
                    (penalty) => `
                    <li class="fade-in">
                        <div class="d-flex justify-content-between">
                            <div>
                                <strong class="text-primary">${
                                  penalty.teamName
                                }</strong> |
                                <span class="text-muted">${
                                  penalty.memberName
                                } (${penalty.memberRole})</span>
                            </div>
                            <small class="text-muted">${penalty.timestamp.toLocaleTimeString()}</small>
                        </div>
                        <div class="mt-1">${penalty.penalty}</div>
                    </li>
                `
                  )
                  .join("")}
            </ul>
        `;
  }

  // Função para exibir a penalidade
  function showPenalty(teamName, memberRole, memberName, penalty) {
    penaltyDisplay.innerHTML = `
            <div class="penalty-card fade-in">
                <h3><i class="fas fa-exclamation-triangle me-2"></i>Penalidade Aplicada</h3>
                <div class="mt-3">
                    <p><strong><i class="fas fa-users me-2"></i>Equipe:</strong> ${teamName}</p>
                    <p><strong><i class="fas fa-user me-2"></i>Membro:</strong> ${memberName} (${memberRole})</p>
                    <p class="mt-3 alert alert-danger"><strong><i class="fas fa-bolt me-2"></i>Penalidade:</strong> ${penalty}</p>
                </div>
            </div>
        `;

    // Efeito visual
    penaltyDisplay.classList.add("pulse");
    setTimeout(() => {
      penaltyDisplay.classList.remove("pulse");
    }, 500);
  }

  // Função para exibir bônus
  function showBonus(teamName, memberRole, memberName, bonus) {
    penaltyDisplay.innerHTML = `
            <div class="bonus-card fade-in">
                <h3><i class="fas fa-gift me-2"></i>Bônus Concedido!</h3>
                <div class="mt-3">
                    <p><strong><i class="fas fa-users me-2"></i>Equipe:</strong> ${teamName}</p>
                    <p><strong><i class="fas fa-user me-2"></i>Membro:</strong> ${memberName} (${memberRole})</p>
                    <p class="mt-3 alert alert-success"><strong><i class="fas fa-star me-2"></i>Bônus:</strong> ${bonus}</p>
                </div>
            </div>
        `;

    // Efeito visual
    penaltyDisplay.classList.add("pulse");
    setTimeout(() => {
      penaltyDisplay.classList.remove("pulse");
    }, 500);
  }

  // Função para remover a penalidade
  function clearPenalty() {
    penaltyDisplay.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-check-circle fa-3x mb-3"></i>
                <h4>Nenhuma penalidade ativa no momento</h4>
                <p>A próxima penalidade será aplicada automaticamente</p>
            </div>
        `;
  }

  // Função para atualizar a lista de equipes
  function updateTeamsList() {
    teamsList.innerHTML = "";

    if (teams.length === 0) {
      teamsList.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="fas fa-users fa-4x mb-4"></i>
                    <h4>Nenhuma equipe cadastrada</h4>
                    <p>Adicione sua primeira equipe usando o formulário acima</p>
                </div>
            `;
      return;
    }

    teams.forEach((team) => {
      const teamCard = document.createElement("div");
      teamCard.className = "col-md-6";
      teamCard.innerHTML = `
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
                            <span id="timer-${
                              team.name
                            }" class="display-6">${formatTime(team.time)}</span>
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
                              team.activeRequests.length > 0
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
                    
                    <div class="mt-3 row g-2">
                        <div class="col-md-6">
                            <div class="input-group">
                                <input type="number" id="timeIncrement-${
                                  team.name
                                }" class="form-control form-control-sm" placeholder="Minutos">
                                <button class="btn btn-sm btn-outline-primary" onclick="changeTime('${
                                  team.name
                                }')">
                                    <i class="fas fa-clock"></i> Ajustar
                                </button>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="input-group">
                                <input type="number" id="moneyIncrement-${
                                  team.name
                                }" class="form-control form-control-sm" placeholder="Valor">
                                <button class="btn btn-sm btn-outline-primary" onclick="changeMoney('${
                                  team.name
                                }')">
                                    <i class="fas fa-money-bill-wave"></i> Ajustar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      teamsList.appendChild(teamCard);
    });
  }

  // Função para formatar o tempo (agora recebe segundos)
  function formatTime(totalSeconds) {
    totalSeconds = Math.round(totalSeconds); // Garantir que estamos trabalhando com números inteiros
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Formatar para sempre mostrar 2 dígitos
    const formattedHours = hours.toString().padStart(2, "0");
    const formattedMinutes = minutes.toString().padStart(2, "0");
    const formattedSeconds = seconds.toString().padStart(2, "0");

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }

  // Modifique a função startTimer para atualização assíncrona
  function startTimer(team) {
    if (!team.timerInterval) {
      team.lastUpdate = Date.now();

      team.timerInterval = setInterval(() => {
        // Usa requestAnimationFrame para atualizações suaves
        requestAnimationFrame(() => {
          const now = Date.now();
          const elapsedSeconds = (now - team.lastUpdate) / 1000;
          team.lastUpdate = now;

          if (team.time > 0) {
            team.time -= elapsedSeconds;

            // Atualiza apenas se o tempo mudou visualmente
            const currentDisplay = formatTime(team.time);
            const timerElement = document.getElementById(`timer-${team.name}`);

            if (timerElement && timerElement.textContent !== currentDisplay) {
              // Atualiza o timer de forma otimizada
              timerElement.textContent = currentDisplay;

              // Atualiza a cor se necessário
              const isCritical = team.time < 3600;
              if (isCritical) {
                timerElement.classList.remove("text-dark");
                timerElement.classList.add("text-danger");
              } else {
                timerElement.classList.remove("text-danger");
                timerElement.classList.add("text-dark");
              }
            }
          } else {
            clearInterval(team.timerInterval);
            team.timerInterval = null;
            showNotification(
              "Tempo Esgotado",
              `O tempo da equipe ${team.name} acabou!`,
              "danger"
            );
          }
        });
      }, 1000);
    }
  }

  // Função otimizada para verificar demandas expiradas
  function checkAndRemoveExpiredRequests() {
    const now = new Date();
    let needsUpdate = false;

    // Verifica demandas globais
    const newUrgentRequests = urgentRequests.filter((request) => {
      const requestEndTime = new Date(request.addedAt);
      requestEndTime.setMinutes(requestEndTime.getMinutes() + request.time);
      return now < requestEndTime;
    });

    if (newUrgentRequests.length !== urgentRequests.length) {
      urgentRequests = newUrgentRequests;
      needsUpdate = true;
    }

    // Verifica demandas em cada equipe
    teams.forEach((team) => {
      if (team.activeRequests && team.activeRequests.length > 0) {
        const newActiveRequests = team.activeRequests.filter((request) => {
          const requestEndTime = new Date(request.addedAt);
          requestEndTime.setMinutes(requestEndTime.getMinutes() + request.time);
          return now < requestEndTime;
        });

        if (newActiveRequests.length !== team.activeRequests.length) {
          team.activeRequests = newActiveRequests;
          needsUpdate = true;
        }
      }
    });

    // Atualiza apenas se necessário
    if (needsUpdate) {
      requestAnimationFrame(() => {
        updateActiveRequests();
        updateTeamsList();
      });
    }
  }

  // Função para atualizar apenas o timer de uma equipe
  function updateTimer(team) {
    const timerElement = document.getElementById(`timer-${team.name}`);
    if (timerElement) {
      timerElement.textContent = formatTime(team.time);

      // Mudar cor se o tempo estiver acabando
      if (team.time < 3600) {
        // Menos de 1 hora
        timerElement.classList.remove("text-dark");
        timerElement.classList.add("text-danger");
      } else {
        timerElement.classList.remove("text-danger");
        timerElement.classList.add("text-dark");
      }
    }
  }

  // Função para alterar o tempo da equipe (agora em segundos)
  window.changeTime = function (teamName) {
    const team = teams.find((t) => t.name === teamName);
    const incrementValue = parseFloat(
      document.getElementById(`timeIncrement-${teamName}`).value
    );

    if (team && !isNaN(incrementValue)) {
      team.time += incrementValue * 60; // Converter minutos para segundos
      updateTimer(team);
      document.getElementById(`timeIncrement-${teamName}`).value = "";

      showNotification(
        "Tempo Ajustado",
        `O tempo da equipe ${teamName} foi ${
          incrementValue >= 0 ? "aumentado" : "reduzido"
        } em ${Math.abs(incrementValue)} minutos.`,
        "info"
      );
    }
  };

  // Função para alterar o dinheiro da equipe
  window.changeMoney = function (teamName) {
    const team = teams.find((t) => t.name === teamName);
    const incrementValue = parseInt(
      document.getElementById(`moneyIncrement-${teamName}`).value
    );
    if (team && !isNaN(incrementValue)) {
      team.money += incrementValue;
      const moneyElement = document.getElementById(`money-${teamName}`);
      if (moneyElement) {
        moneyElement.textContent = `R$ ${team.money.toLocaleString("pt-BR")}`;
      }
      document.getElementById(`moneyIncrement-${teamName}`).value = "";

      showNotification(
        "Orçamento Ajustado",
        `O orçamento da equipe ${teamName} foi ${
          incrementValue >= 0 ? "aumentado" : "reduzido"
        } em R$ ${Math.abs(incrementValue).toLocaleString("pt-BR")}.`,
        "info"
      );
    }
  };

  // Função para salvar o estado no localStorage
  function saveLoansToLocalStorage() {
    const appState =
      JSON.parse(localStorage.getItem("scrumSimulatorData")) || {};
    appState.activeLoans = activeLoans.map((loan) => {
      return {
        ...loan,
        remainingTime:
          Math.max(0, loan.time * 60) -
          Math.floor((Date.now() - new Date(loan.addedAt).getTime()) / 1000),
      };
    });
    localStorage.setItem("scrumSimulatorData", JSON.stringify(appState));
  }

  // Salvar o estado sempre que houver mudanças
  teamForm.addEventListener("submit", function () {
    setTimeout(saveStateToLocalStorage, 100);
  });

  addRequestBtn.addEventListener("click", function () {
    setTimeout(saveStateToLocalStorage, 100);
  });

  startButton.addEventListener("click", saveStateToLocalStorage);
  resetButton.addEventListener("click", saveStateToLocalStorage);

  // Salvar periodicamente (a cada 5 segundos) para garantir sincronização
  setInterval(saveStateToLocalStorage, 60000);

  let lastSavedState = null;

  function saveStateToLocalStorage() {
    const currentState = {
      teams,
      recentPenalties,
      urgentRequests,
      activePenalty: recentPenalties[0] || null,
      isSimulationRunning,
      lastUpdate: new Date().toISOString(),
      activeLoans: activeLoans.map((loan) => ({
        ...loan,
        // Calcula o tempo restante baseado no tempo inicial e no tempo decorrido
        remainingTime:
          Math.max(0, loan.time * 60) -
          Math.floor((Date.now() - new Date(loan.addedAt).getTime()) / 1000),
      })),
    };

    // Só salva se o estado tiver mudado
    if (JSON.stringify(currentState) !== JSON.stringify(lastSavedState)) {
      localStorage.setItem("scrumSimulatorData", JSON.stringify(currentState));
      lastSavedState = currentState;
    }
  }

  // Salvar estado inicial
  saveStateToLocalStorage();
  // Inicializar a exibição de penalidades
  clearPenalty();
  updatePenaltyHistory();
  updateActiveRequests();
});
