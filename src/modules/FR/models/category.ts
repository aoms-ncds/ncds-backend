import mongoose from 'mongoose';


export interface IMainCategory {
  // _id: Types.ObjectId;
  name: string;
  subcategory1: {
    name: string;
    subcategory2: {
      name: string;
      subcategory3: {
        name: string;
        narration: string;
      }[];
    }[];
  }[];
}


const MainCategorySchema = new mongoose.Schema<IMainCategory>({
  name: {type: String, required: false},
  subcategory1: [{
    name: {type: String, required: false},
    subcategory2: [{
      name: {type: String, required: false},
      subcategory3: [{
        name: {type: String, required: false},
        narration: {type: String, required: false},
      }],
    }],
  }],
});


const MainCategory = mongoose.model<IMainCategory>('main_category', MainCategorySchema);

// eslint-disable-next-line no-irregular-whitespace
export default  MainCategory;
