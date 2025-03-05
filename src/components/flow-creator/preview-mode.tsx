import {useEffect, useState} from "react"
import {Button} from "~/components/ui/button"
import {Progress} from "~/components/ui/progress"

interface PreviewModeProps {
  steps: any[]
  // connections: any[]
}

export default function PreviewMode({ steps }: PreviewModeProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const duration = steps.reduce((total, step) => total + (step.duration || 0), 0)
    setTotalDuration(duration)
  }, [steps])

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
      setElapsedTime((prev) => prev + (steps[currentStep].duration || 0))
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      setElapsedTime((prev) => prev - (steps[currentStep - 1].duration || 0))
    }
  }

  const currentStepData = steps[currentStep]

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Preview Mode</h2>
      <div className="flex justify-between items-center">
        <Button onClick={handlePrevStep} disabled={
currentStep === 0}>
          Previous Step
        </Button>
        <Button onClick={handleNextStep} disabled={currentStep === steps.length - 1}>
          Next Step
        </Button>
      </div>
      <div className="border p-4 rounded-md">
        <h3 className="text-lg font-semibold">{currentStepData.name}</h3>
        <p>{currentStepData.description}</p>
        <p>Assignee: {currentStepData.assignee}</p>
        <p>Duration: {currentStepData.duration} hours</p>
      </div>
      <div>
        <p>Total Duration: {totalDuration} hours</p>
        <p>Elapsed Time: {elapsedTime} hours</p>
        <Progress value={(elapsedTime / totalDuration) * 100} />
      </div>
    </div>
  )
}

