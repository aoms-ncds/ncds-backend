import cron from 'node-cron';
import Worker from '../../models/Worker';
import PmaDeduction from '../../../HR/models/pmaDeduction';


export default async function pmaDeduction() {
  console.log('Cron job is running!');

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Month (1-12)
  const currentYear = currentDate.getFullYear();

  console.log('Current Month:', currentMonth);

  const allWorkers = await Worker.find();

  await Promise.all(
    allWorkers.map(async (worker) => {
      if (!worker.officialDetails || !worker.officialDetails.dateOfJoining) {
        console.log('No joining date found for worker:', worker._id);
        return;
      }

      const joiningDate = new Date(worker.officialDetails.dateOfJoining);
      const joiningMonth = joiningDate.getMonth() + 1; // Convert 0-based month to 1-based
      const joiningYear = joiningDate.getFullYear();

      // Calculate total months worked
      const totalMonthsWorked = (currentYear - joiningYear) * 12 + (currentMonth - joiningMonth + 1);

      console.log(`Worker ${worker._id} has worked for ${totalMonthsWorked} months`);

      // Process PMA Deduction
      const pmaData = await PmaDeduction.findById(worker.supportStructure.pmaDeduction);
      if (!pmaData) {
        // console.log(`No PMA deduction data found for worker: ${worker._id}`);
        return;
      }

      let updated = false;
      for (const deduction of pmaData.deductions) {
        console.log(`Checking deduction range: ${deduction.monthFrom} - ${deduction.monthTo} for total months: ${totalMonthsWorked}`);

        // Check if totalMonthsWorked falls within the deduction range
        if (totalMonthsWorked >= deduction.monthFrom && totalMonthsWorked <= deduction.monthTo) {
          console.log(
            `Updating deductionAmount for Worker ${worker._id} in range (${deduction.monthFrom}-${deduction.monthTo})`,
          );

          // Update pmaData.amount with deductionAmount
          pmaData.amount = deduction.deductionAmount;
          updated = true;
        }
      }

      if (updated) {
        await pmaData.save(); // Save the updated deduction amount
        console.log(`Updated PMA deduction amount to ${pmaData.amount} for worker ${worker._id}`);
      }
    }),
  );
}

export const startPmaDeduction = async () => {
  cron.schedule('0 0 1 * * *', pmaDeduction);
};
