const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const resultDiv = document.getElementById("result");
const spinButton = document.getElementById("spinButton");

// --- НАСТРОЙКИ РАНГОВ И ВЕРОЯТНОСТЕЙ ---
const RAW_RANKS_DATA = {
    "E": {"name": "E-Ранг", "chance_parts": 35, "color": "#A9A9A9"}, // DarkGray
    "D": {"name": "D-Ранг", "chance_parts": 30, "color": "#6BCB77"}, // Пастельный зеленый
    "C": {"name": "C-Ранг", "chance_parts": 20, "color": "#5DADE2"}, // Пастельный синий
    "B": {"name": "B-Ранг", "chance_parts": 10, "color": "#AF7AC5"}, // Пастельный фиолетовый
    "A": {"name": "A-Ранг", "chance_parts": 3, "color": "#F1C40F"},  // Желтый (золото)
    "S": {"name": "S-Ранг", "chance_parts": 1.5, "color": "#E74C3C"}, // Пастельный красный
    "NATIONAL": {"name": "Национальный Уровень", "chance_parts": 0.5, "color": "#E67E22"}, // Оранжевый
};

function calculateDerivedRankData(ranksInput) {
    const rankKeys = Object.keys(ranksInput);
    const calculatedPercentages = {};
    const preppedCumulativeWeights = [];
    let currentTotalParts = 0;

    rankKeys.forEach(key => {
        currentTotalParts += ranksInput[key].chance_parts;
    });
    
    if (currentTotalParts === 0 && rankKeys.length > 0) {
        const equalPart = 1; // Assign equal parts if all are zero
        rankKeys.forEach(key => { ranksInput[key].chance_parts = equalPart; });
        currentTotalParts = rankKeys.length;
    } else if (currentTotalParts === 0 && rankKeys.length === 0) {
        console.error("Нет данных о рангах для обработки.");
        return { ranks: {}, percentages: {}, cumulativeWeights: [], totalParts: 0 };
    }

    let cumulativeValue = 0;
    let sumOfRoundedPercentages = 0;

    rankKeys.forEach((key, index) => {
        const rank = ranksInput[key];
        let percentage;
        if (index < rankKeys.length - 1) {
            percentage = (rank.chance_parts / currentTotalParts) * 100;
            calculatedPercentages[key] = parseFloat(percentage.toFixed(2));
            sumOfRoundedPercentages += calculatedPercentages[key];
        } else {
            calculatedPercentages[key] = parseFloat((100 - sumOfRoundedPercentages).toFixed(2));
        }
        cumulativeValue += rank.chance_parts;
        preppedCumulativeWeights.push({ key: key, weightEnd: cumulativeValue });
    });
    
    const finalTotalPercentage = Object.values(calculatedPercentages).reduce((sum, p) => sum + p, 0);
    if (rankKeys.length > 0 && Math.abs(finalTotalPercentage - 100) > 0.001) {
        const diff = 100 - finalTotalPercentage;
        const lastKey = rankKeys[rankKeys.length - 1];
        calculatedPercentages[lastKey] = parseFloat((calculatedPercentages[lastKey] + diff).toFixed(2));
    }

    return {
        ranks: ranksInput,
        percentages: calculatedPercentages,
        cumulativeWeights: preppedCumulativeWeights,
        totalParts: currentTotalParts
    };
}

const { ranks, percentages, cumulativeWeights, totalParts } = calculateDerivedRankData(RAW_RANKS_DATA);

// Глобальные переменные для колеса
const FONT_FAMILY = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
let wheelAngleOffset = 0; // Текущий угол поворота колеса
let spinning = false;
let lastSpunRankData = null;


function drawWheel() {
  const size = canvas.width;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 20; // Отступ для указателя и тени

  ctx.clearRect(0, 0, size, size);

  let currentSegmentStartAngle = 0; // В градусах, 0 = 3 часа
  const rankKeys = Object.keys(ranks);

  if (rankKeys.length === 0) {
      ctx.fillStyle = "gray";
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = `bold 20px ${FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Нет данных для колеса", centerX, centerY);
      return;
  }


  rankKeys.forEach((key, i) => {
    const rankInfo = ranks[key];
    const percent = parseFloat(percentages[key]);
    const sweepAngle = (percent / 100) * 360;
    const currentSegmentEndAngle = currentSegmentStartAngle + sweepAngle;

    const startRad = (currentSegmentStartAngle - wheelAngleOffset) * Math.PI / 180;
    const endRad = (currentSegmentEndAngle - wheelAngleOffset) * Math.PI / 180;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startRad, endRad);
    ctx.closePath();
    ctx.fillStyle = rankInfo.color || "#CCCCCC"; // Цвет из конфига или по умолчанию
    ctx.fill();
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Текст на сегменте
    const midPointAngleDegrees = currentSegmentStartAngle + sweepAngle / 2;
    const midPointRotatedAngleDegrees = (midPointAngleDegrees - wheelAngleOffset % 360 + 360) % 360;
    
    const textRadius = radius * 0.65;
    const textX = centerX + textRadius * Math.cos(midPointRotatedAngleDegrees * Math.PI / 180);
    const textY = centerY + textRadius * Math.sin(midPointRotatedAngleDegrees * Math.PI / 180);

    ctx.save();
    ctx.translate(textX, textY);
    let textRotationDegrees = midPointRotatedAngleDegrees;
    if (textRotationDegrees > 90 && textRotationDegrees < 270) {
        textRotationDegrees += 180;
    }
    ctx.rotate(textRotationDegrees * Math.PI / 180);
    
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const rankNameParts = rankInfo.name.split(' ');
    const baseFontSize = (rankInfo.name.length > 12 || rankNameParts.length > 1) ? 9 : 11;
    
    ctx.font = `bold ${baseFontSize}px ${FONT_FAMILY}`;
    if (rankNameParts.length > 1 && (rankInfo.name.length > 10 || rankNameParts[0].length > 7)) {
        ctx.fillText(rankNameParts[0], 0, -baseFontSize * 0.7);
        ctx.fillText(rankNameParts.slice(1).join(' '), 0, baseFontSize * 0.7);
        ctx.font = `normal ${baseFontSize-2}px ${FONT_FAMILY}`;
        ctx.fillText(`(${percentages[key]}%)`, 0, baseFontSize * 2.1);
    } else {
        ctx.fillText(rankInfo.name, 0, -baseFontSize * 0.5);
        ctx.font = `normal ${baseFontSize-2}px ${FONT_FAMILY}`;
        ctx.fillText(`(${percentages[key]}%)`, 0, baseFontSize * 0.7);
    }
    ctx.restore();
    currentSegmentStartAngle = currentSegmentEndAngle;
  });

  // Указатель (стрелка сверху)
  ctx.fillStyle = "gold";
  ctx.beginPath();
  ctx.moveTo(centerX - 10, centerY - radius - 15);
  ctx.lineTo(centerX + 10, centerY - radius - 15);
  ctx.lineTo(centerX, centerY - radius - 0); // Острие чуть заходит на колесо
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "darkgoldenrod";
  ctx.lineWidth = 1.5;
  ctx.stroke();

   // Центральный круг
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.1, 0, 2 * Math.PI);
  ctx.fillStyle = '#2a2a40';
  ctx.fill();
  ctx.strokeStyle = ranks.S ? ranks.S.color : '#4D96FF'; // Цвет S-ранга или синий
  ctx.lineWidth = 2;
  ctx.stroke();
}


// Логика выбора ранга (замена /spin)
function getWeightedRandomRank() {
    if (totalParts === 0) {
        console.error("Невозможно выбрать ранг: totalParts равен нулю.");
        // Возвращаем первый ранг по умолчанию или ошибку
        const keys = Object.keys(ranks);
        return keys.length > 0 ? { key: keys[0], ...ranks[keys[0]] } : null;
    }
    const randomValue = Math.random() * totalParts;
    for (const item of cumulativeWeights) {
        if (randomValue < item.weightEnd) {
            return { key: item.key, ...ranks[item.key] };
        }
    }
    // На случай погрешностей float, вернуть последний элемент
    const lastKey = cumulativeWeights[cumulativeWeights.length - 1].key;
    return { key: lastKey, ...ranks[lastKey] };
}

function calculateFinalWheelOffset(winningRankName) {
    let cumulativePercent = 0;
    let targetSegmentMidPercent = 0;

    const rankKeys = Object.keys(ranks);
    for (const key of rankKeys) {
        const rankInfo = ranks[key];
        const percent = parseFloat(percentages[key]);

        if (rankInfo.name === winningRankName) {
            targetSegmentMidPercent = cumulativePercent + percent / 2;
            break;
        }
        cumulativePercent += percent;
    }
    
    const segmentMidStaticAngle = (targetSegmentMidPercent / 100) * 360;
    const pointerCanvasAngle = 270; // Указатель сверху (12 часов)
    let requiredWheelRotation = (segmentMidStaticAngle - pointerCanvasAngle + 360) % 360;
    return requiredWheelRotation;
}

function animateSpin(targetOffsetForWheelZero) {
    spinning = true;
    spinButton.disabled = true;
    resultDiv.innerHTML = `<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Вращаем...</span></div> <p class="mt-2">Определяем вашу судьбу...</p>`;

    const spinStartTime = performance.now();
    const spinDuration = 5000; // 5 секунд
    const baseRotationsInDegrees = 7 * 360; // Минимум 7 полных оборотов

    const initialWheelAngleOffset = wheelAngleOffset;
    const destinationAngle = initialWheelAngleOffset + baseRotationsInDegrees + 
                           ((targetOffsetForWheelZero - (initialWheelAngleOffset % 360) + 360) % 360);
    
    function frame(currentTime) {
        const elapsedTime = currentTime - spinStartTime;

        if (elapsedTime >= spinDuration) {
            wheelAngleOffset = targetOffsetForWheelZero;
            drawWheel();
            spinning = false;
            spinButton.disabled = false;
            const username = document.getElementById("username").value.trim() || "Охотник";
            if (lastSpunRankData) {
                resultDiv.innerHTML = `Поздравляем, <strong>${username}</strong>! Вам выпал:<br><span class="text-warning" style="color:${lastSpunRankData.color || '#FFD700'} !important;">${lastSpunRankData.name}</span><br>(${percentages[lastSpunRankData.key].toFixed(2)}%)`;
                // Запуск конфетти!
                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 150,
                        spread: 90,
                        origin: { y: 0.6 }
                    });
                }
            }
            return;
        }

        const t = elapsedTime / spinDuration;
        const easedT = 1 - Math.pow(1 - t, 4); // easeOutQuart

        wheelAngleOffset = initialWheelAngleOffset + (destinationAngle - initialWheelAngleOffset) * easedT;
        
        drawWheel();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function startSpin() {
  if (spinning) return;
  const usernameInput = document.getElementById("username");
  const username = usernameInput.value.trim();

  if (Object.keys(ranks).length === 0) {
      resultDiv.innerHTML = `<span class="text-danger">Ошибка: Данные о рангах не загружены.</span>`;
      return;
  }

  if (!username) {
    resultDiv.innerHTML = `<span class="text-danger">Пожалуйста, введите ваше имя, Охотник!</span>`;
    usernameInput.focus();
    return;
  }

  resultDiv.innerHTML = ""; 

  // Получаем результат вращения ЛОКАЛЬНО
  const chosenRank = getWeightedRandomRank();
  if (!chosenRank) {
      resultDiv.innerHTML = `<span class="text-danger">Ошибка при выборе ранга.</span>`;
      console.error("Chosen rank is null or undefined");
      return;
  }
  lastSpunRankData = chosenRank; // Сохраняем данные для отображения после анимации
  
  let finalWheelTargetOffset = calculateFinalWheelOffset(chosenRank.name);
  animateSpin(finalWheelTargetOffset);
}

// Изначальная отрисовка колеса
if (Object.keys(ranks).length > 0) {
    drawWheel();
} else {
    resultDiv.innerHTML = `<span class="text-danger">Ошибка: Не удалось инициализировать колесо. Проверьте конфигурацию рангов.</span>`;
}