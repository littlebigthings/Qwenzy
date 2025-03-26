#!/bin/bash

# Create a temporary file with the new content
cat > temp/new_sidebar.txt << 'EOT'
        {/* Left sidebar with steps */}
        <div className="bg-gray-50 p-6 border-r">
          <div className="space-y-2">
            {steps
              // Filter steps for invited users - only show profile and workspace steps
              .filter(step => !isInvitation || (step.id !== "organization" && step.id !== "invite"))
              .map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = currentStep === step.id;
                
                // For invited users, make both steps clickable
                const isClickable = isInvitation || 
                  index === 0 || 
                  completedSteps.includes(steps[index - 1].id);

                return (
                  <button
                    key={step.id}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors
                      ${isCurrent ? "bg-white shadow-sm" : "hover:bg-white/50"}
                      ${!isClickable ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    onClick={() => isClickable && setCurrentStep(step.id)}
                    disabled={!isClickable}
                  >
                    <div className="w-8 h-8 flex-shrink-0">
                      {isCompleted ? (
                        <img
                          src="src/assets/completed.svg"
                          alt="Complete"
                          className="w-full h-full"
                        />
                      ) : (
                        <img
                          src={isCurrent ? step.active : step.icon}
                          alt={step.label}
                          className="w-full h-full"
                        />
                      )}
                    </div>
                    <div>
                      <h3
                        className={`text-base font-medium ${
                          isCurrent ? "text-[#407c87]" : "text-gray-700"
                        }`}
                      >
                        {step.label}
                      </h3>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
EOT

# Find the pattern to replace and replace it with sed
# Create a pattern file with the text to match
cat > temp/pattern.txt << 'EOT'
        {/* Left sidebar with steps */}
        <div className="bg-gray-50 p-6 border-r">
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const isClickable =
                index === 0 || completedSteps.includes(steps[index - 1].id);

              return (
                <button
                  key={step.id}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors
                    ${isCurrent ? "bg-white shadow-sm" : "hover:bg-white/50"}
                    ${!isClickable ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                  onClick={() => isClickable && setCurrentStep(step.id)}
                  disabled={!isClickable}
                >
                  <div className="w-8 h-8 flex-shrink-0">
                    {isCompleted ? (
                      <img
                        src="src/assets/completed.svg"
                        alt="Complete"
                        className="w-full h-full"
                      />
                    ) : (
                      <img
                        src={isCurrent ? step.active : step.icon}
                        alt={step.label}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                  <div>
                    <h3
                      className={`text-base font-medium ${
                        isCurrent ? "text-[#407c87]" : "text-gray-700"
                      }`}
                    >
                      {step.label}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
EOT

# Use node to do the replacement (more reliable than sed for multiline)
node -e '
const fs = require("fs");
const filePath = "client/src/components/onboarding-flow.tsx";
const oldContent = fs.readFileSync(filePath, "utf8");
const pattern = fs.readFileSync("temp/pattern.txt", "utf8");
const replacement = fs.readFileSync("temp/new_sidebar.txt", "utf8");
const newContent = oldContent.replace(pattern, replacement);
fs.writeFileSync(filePath, newContent, "utf8");
console.log("File updated successfully");
'

echo "Updated the sidebar in onboarding-flow.tsx"
