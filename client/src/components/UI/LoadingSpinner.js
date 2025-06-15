const LoadingSpinner = ({ size = "large" }) => {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  }

  return (
    <div className="flex justify-center items-center p-4">
      <div className={`spinner ${sizeClasses[size]}`}></div>
    </div>
  )
}

export default LoadingSpinner
