export function setupPostcode({clientPostalCode,postcodeStatus,addressSuggestions,clientAddress,updateBookingSubmitState,updatePersonalizadoRequirement,onSelect}){
  let lastPostalLookup = "";
  let postalLookupController = null;

  function normalizePostalCode(value){
    const digits = String(value || "").replace(/\D/g, "").slice(0, 7);
    if(digits.length <= 4) return digits;
    return digits.slice(0, 4) + "-" + digits.slice(4);
  }

  function setPostcodeStatus(message, type=""){
    if(!postcodeStatus) return;
    postcodeStatus.textContent = message || "";
    postcodeStatus.classList.remove("error", "success");
    if(type) postcodeStatus.classList.add(type);
  }

  function closeAddressSuggestions(){
    if(!addressSuggestions) return;
    addressSuggestions.classList.remove("is-open");
    addressSuggestions.innerHTML = "";
  }

  function uniqueAddressOptions(data){
    const options = [];
    const seen = new Set();

    const locality = String(
      data.Localidade ||
      data["Designação Postal"] ||
      data.Concelho ||
      ""
    ).trim();

    function addOption(street){
      const rua = String(street || "").trim();
      if(!rua) return;

      const label = locality ? rua + " — " + locality : rua;
      const key = label.toLocaleLowerCase("pt-PT");

      if(seen.has(key)) return;
      seen.add(key);

      options.push({
        street: rua,
        locality: locality,
        label: label
      });
    }

    if(Array.isArray(data.partes)){
      data.partes.forEach(function(item){
        if(item && item["Artéria"]) addOption(item["Artéria"]);
      });
    }

    if(Array.isArray(data.ruas)){
      data.ruas.forEach(addOption);
    }

    if(!options.length && locality){
      options.push({
        street: "",
        locality: locality,
        label: locality
      });
    }

    return options;
  }

  function renderAddressSuggestions(data, postalCode){
    if(!addressSuggestions) return;

    const options = uniqueAddressOptions(data);
    addressSuggestions.innerHTML = "";

    if(!options.length){
      closeAddressSuggestions();
      setPostcodeStatus(
        "Código postal encontrado. Escreva a morada manualmente.",
        "success"
      );
      return;
    }

    options.forEach(function(option){
      const button = document.createElement("button");
      button.type = "button";
      button.className = "address-suggestion";
      button.setAttribute("role", "option");

      const strong = document.createElement("strong");
      strong.textContent = option.street || option.locality;

      const small = document.createElement("small");
      const details = [
        option.locality,
        postalCode,
        data.Concelho
      ].filter(Boolean);

      small.textContent = [...new Set(details)].join(" · ");

      button.appendChild(strong);
      button.appendChild(small);

      button.addEventListener("click", function(){
        const addressParts = [];

        if(option.street) addressParts.push(option.street);
        if(option.locality) addressParts.push(option.locality);

        clientAddress.value = option.street || option.locality;
        onSelect(option.locality);
        clientAddress.focus();
        clientAddress.setSelectionRange(
          clientAddress.value.length,
          clientAddress.value.length
        );

        closeAddressSuggestions();
        setPostcodeStatus("Morada selecionada. Pode acrescentar porta, andar ou fração.", "success");
        updateBookingSubmitState();
      });

      addressSuggestions.appendChild(button);
    });

    addressSuggestions.classList.add("is-open");
    setPostcodeStatus(
      options.length === 1
        ? "Encontrámos 1 opção de morada."
        : "Encontrámos " + options.length + " opções. Escolha a sua morada.",
      "success"
    );
  }

  async function lookupPostalCode(postalCode){
    if(!clientPostalCode) return;

    if(postalLookupController){
      postalLookupController.abort();
    }

    postalLookupController = new AbortController();

    setPostcodeStatus("A procurar moradas...");
    closeAddressSuggestions();

    try{
      const response = await fetch(
        "https://json.geoapi.pt/cp/" + encodeURIComponent(postalCode),
        {
          method: "GET",
          headers: { "Accept": "application/json" },
          signal: postalLookupController.signal
        }
      );

      if(!response.ok){
        throw new Error("Código postal não encontrado.");
      }

      const data = await response.json();

      if(!data || !data.CP){
        throw new Error("Código postal não encontrado.");
      }

      renderAddressSuggestions(data, postalCode);

    }catch(error){
      if(error && error.name === "AbortError") return;

      closeAddressSuggestions();
      setPostcodeStatus(
        "Não foi possível obter a morada automaticamente. Confirme o código postal e escreva a morada manualmente.",
        "error"
      );
    }
  }

  if(clientPostalCode){
    clientPostalCode.addEventListener("input", function(){
      const formatted = normalizePostalCode(clientPostalCode.value);

      if(clientPostalCode.value !== formatted){
        clientPostalCode.value = formatted;
      }

      clientPostalCode.setCustomValidity("");
      closeAddressSuggestions();
      setPostcodeStatus("");

      if(formatted.length === 8){
        if(!/^\d{4}-\d{3}$/.test(formatted)){
          clientPostalCode.setCustomValidity("Introduza um código postal no formato 1234-567.");
          return;
        }

        if(lastPostalLookup !== formatted){
          lastPostalLookup = formatted;
          lookupPostalCode(formatted);
        }
      }else{
        lastPostalLookup = "";
      }

      updateBookingSubmitState();
    });

    clientPostalCode.addEventListener("blur", function(){
      if(clientPostalCode.value && !/^\d{4}-\d{3}$/.test(clientPostalCode.value.trim())){
        clientPostalCode.setCustomValidity("Introduza os 7 dígitos do código postal.");
      }else{
        clientPostalCode.setCustomValidity("");
      }
    });
  }

  document.addEventListener("click", function(event){
    if(
      addressSuggestions &&
      clientPostalCode &&
      !addressSuggestions.contains(event.target) &&
      event.target !== clientPostalCode
    ){
      addressSuggestions.classList.remove("is-open");
    }
  });

  updatePersonalizadoRequirement();
  updateBookingSubmitState();


}