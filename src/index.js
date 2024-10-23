import PandaBridge from "pandasuite-bridge";
import Quill from "quill";
import katex from "katex";
import isEqual from "lodash/isEqual";
import debounce from "lodash/debounce";

import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
import "./index.css";
import "katex/dist/katex.min.css";

let quill = null;
let properties = null;
let shouldForceFocus = false;

window.katex = katex;

window.addEventListener("blur", () => {
  shouldForceFocus = true;
});

const mutableProperties = {
  content: true,
  readOnly: true,
};

const validationState = {
  validated: false,
  isEmpty: false,
};

function getQueryable() {
  return {
    text: quill.getText(),
    html: quill.getSemanticHTML(),
    content: quill.getContents(),
    validation: validationState,
  };
}

function validate() {
  const text = quill.getText().trim();
  validationState.validated = true;
  validationState.isEmpty = text.length === 0;

  const queryable = getQueryable();

  // prevent multiple updates
  properties.content.ops = queryable.content.ops;

  PandaBridge.send(PandaBridge.UPDATED, { queryable });
  PandaBridge.send("onValidated", [queryable]);
}

function updateText(text) {
  if (!text) {
    return;
  }
  const shouldDisable = !properties?.readOnly && !quill.hasFocus();

  if (shouldDisable) {
    quill.enable(false);
  }
  if (typeof text === "string") {
    if (/<\/?[a-z][\s\S]*>/i.test(text)) {
      quill.clipboard.dangerouslyPasteHTML(text);
    } else {
      quill.setText(text);
    }
  } else {
    quill.setContents(text);
  }
  if (shouldDisable) {
    quill.enable(true);
  }
}

function updateQuill() {
  if (properties?.content) {
    updateText(properties.content);
  }
  quill.enable(!properties.readOnly);
}

function getToolbarOptions() {
  const toolbarOptions = [];

  if (properties?.toolbarHeader) {
    toolbarOptions.push([{ header: [1, 2, 3, 4, 5, 6, false] }]);
  }
  if (properties?.toolbarStyle) {
    toolbarOptions.push(["bold", "italic", "underline", "strike"]);
  }
  if (properties?.toolbarBlock) {
    toolbarOptions.push(["blockquote", "code-block"]);
  }
  if (properties?.toolbarMedia) {
    toolbarOptions.push(["link", "image", "video", "formula"]);
  }
  if (properties?.toolbarList) {
    toolbarOptions.push([
      { list: "ordered" },
      { list: "bullet" },
      { list: "check" },
    ]);
  }
  if (properties?.toolbarScript) {
    toolbarOptions.push([{ script: "sub" }, { script: "super" }]);
  }
  if (properties?.toolbarIndent) {
    toolbarOptions.push([{ indent: "-1" }, { indent: "+1" }]);
  }
  if (properties?.toolbarDirection) {
    toolbarOptions.push([{ direction: "rtl" }]);
  }
  if (properties?.toolbarColor) {
    toolbarOptions.push([{ color: [] }, { background: [] }]);
  }
  if (properties?.toolbarFont) {
    toolbarOptions.push([{ font: [] }]);
  }
  if (properties?.toolbarAlign) {
    toolbarOptions.push([{ align: [] }]);
  }
  if (properties?.toolbarClean) {
    toolbarOptions.push(["clean"]);
  }
  if (properties?.toolbarHistory) {
    toolbarOptions.push(["undo", "redo"]);
  }

  return toolbarOptions;
}

function initQuill() {
  const toolbar = properties?.toolbar
    ? {
        container: getToolbarOptions(),
        handlers: {
          undo: () => {
            quill.history.undo();
          },
          redo: () => {
            quill.history.redo();
          },
        },
      }
    : false;

  const options = {
    modules: {
      toolbar,
    },
    history: {
      delay: 1000,
      maxStack: 100,
      userOnly: true,
    },
    theme: "snow",
  };

  if (properties?.placeholder) {
    options.placeholder = properties.placeholder;
  }

  if (quill) {
    quill.off("text-change");
    quill.off("selection-change");
    document.body.innerHTML = '<div id="editor"></div>';
  }

  quill = new Quill("#editor", options);

  if (PandaBridge.isStudio) {
    const { scale = 1 } = PandaBridge.isStudio;

    document.body.style.setProperty("--scale", scale);
    document.body.style.setProperty("--scale-inverse", 1 / scale);

    quill.on("text-change", () => {
      PandaBridge.send(PandaBridge.UPDATED, {
        properties: [
          {
            id: "content",
            value: quill.getContents(),
          },
        ],
        queryable: getQueryable(),
      });
    });
  }
  if (properties?.debounce) {
    quill.on(
      "text-change",
      debounce(() => {
        validate();
      }, properties.debounceTime || 300),
    );
  }

  quill.on("selection-change", (range, oldRange) => {
    if (shouldForceFocus || (range !== null && oldRange === null)) {
      const queryable = getQueryable();

      PandaBridge.send("onFocused", [queryable]);
      shouldForceFocus = false;
    }
  });

  updateQuill();
}

PandaBridge.init(() => {
  PandaBridge.onLoad((pandaData) => {
    properties = pandaData.properties;

    if (document.readyState === "complete") {
      initQuill();
    } else {
      document.addEventListener("DOMContentLoaded", initQuill, false);
    }
  });

  PandaBridge.onUpdate((pandaData) => {
    const diffKeys = Object.keys(pandaData.properties).filter(
      (key) => !isEqual(properties[key], pandaData.properties[key]),
    );
    if (diffKeys.length === 0) {
      return;
    }
    const changesIsOnlyMutable = diffKeys.every(
      (key) => mutableProperties[key],
    );
    properties = pandaData.properties;

    if (changesIsOnlyMutable) {
      updateQuill();
    } else {
      initQuill();
    }
  });

  PandaBridge.listen("validate", () => {
    validate();
  });

  PandaBridge.listen("setText", ([props]) => {
    const { text } = props || {};

    if (quill) {
      updateText(text);
    }
  });

  PandaBridge.listen("setContent", ([props]) => {
    const { content } = props || {};

    if (quill) {
      updateText(content);
    }
  });

  PandaBridge.listen("clearText", () => {
    if (quill) {
      updateText("");
    }
  });

  PandaBridge.listen("focusText", () => {
    if (quill) {
      quill.focus();
      if (shouldForceFocus) {
        const queryable = getQueryable();

        PandaBridge.send("onFocused", [queryable]);
        shouldForceFocus = false;
      }
    }
  });
});

const icons = Quill.import("ui/icons");
icons.undo =
  '<svg viewbox="0 0 18 18"><polygon class="ql-fill ql-stroke" points="6 10 4 12 2 10 6 10"></polygon>' +
  '<path class="ql-stroke" d="M8.09,13.91A4.6,4.6,0,0,0,9,14,5,5,0,1,0,4,9"></path></svg>';
icons.redo =
  '<svg viewbox="0 0 18 18"><polygon class="ql-fill ql-stroke" points="12 10 14 12 16 10 12 10"></polygon>' +
  '<path class="ql-stroke" d="M9.91,13.91A4.6,4.6,0,0,1,9,14a5,5,0,1,1,5-5"></path></svg>';
